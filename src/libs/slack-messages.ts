import { ICommitCheck } from '../events/types';
import { User, PullRequest, CommitCheck, PullRequestReview, PullRequestReviewRequest, Repository } from '../entity'
import { detectPipelineMasterStatus } from './circleci';
import { pseudoRandomBytes } from 'crypto';

export interface IMessageData {
	text: string
	blocks?: IMessgeBlock[]
}


interface IMessgeBlock {
	type: 'section'| 'context' | "actions" | "divider"
	text?: string | { type: 'mrkdwn' | 'plain_text', text?: string, plain_text?: string }
	blocks?: []
	accessory?: any
	elements?: any
}

function encodeAction(actionName: string, actionData: {}) {
	return `${actionName}___${encodeURIComponent(JSON.stringify(actionData))}`
}

export function getWelcomeMessage(user: User): IMessageData {
	if (user.team.githubConnected){
		let authLink = process.env.GH_OAUTH_URL + `?userId=${user.id}`
		return { text: `Hi :wave:, please connect your <${authLink}|GitHub account> to use the Devilery.` }
	} else {
		let authLink = process.env.GH_APP_INSTAL_URL + `?state=${user.team.id}`
		return { text: `Welcome :raised_hand_with_fingers_splayed:, please install our <${authLink}|GitHub app> to use the Devilery. P.S. admin rights are needed, if you don’t have them, please ping you admin. See you soon!` }
	}
}

export function getReviewRegisterMessage(user: User, authorSlackUsername: string): IMessageData {
	let authLink = process.env.GH_OAUTH_URL + `?userId=${user.id}`
	return { text: `Hi :wave:, @${authorSlackUsername} request a review on his pull request. Please connect your <${authLink}|GitHub account> to get started with Devilery.` }
}

function getBaseBlock(pr: PullRequest, repo: Repository): IMessgeBlock {
	return {
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": `*PR #${pr.prNumber}: <${pr.websiteUrl} | ${pr.title}> * _in <${repo.websiteUrl} | ${repo.name}>_`
		},
		"accessory": {
			"type": "button",
			"text": {
				"type": "plain_text",
				"text": "PR: Opened",
				"emoji": true
			},
			"style": "primary",
			"value": "null"
		}
	}
}

function getActionBlocks(pr: PullRequest): IMessgeBlock {
	return {
		"type": "actions",
		"elements": [
			{
				"type": "users_select",
				"action_id": encodeAction('review_assign', { pr_id: pr.id }),
				"placeholder": {
					"type": "plain_text",
					"text": "Assign review",
					"emoji": true
				}
			},
			{
				"type": "button",
				"text": {
					"type": "plain_text",
					"text": "Merge PR 🔥",
					"emoji": true
				},
				"confirm": {
					"title": {
						"type": "plain_text",
						"text": "confirm merge",
					},
					"text": {
						"type": "plain_text",
						"text": `Do you really want to merge PR #${pr.prNumber} ${pr.title}?`
					},
					"confirm": {
						"type": "plain_text",
						"text": "Merge please",
					},
					"deny": {
						"type": "plain_text",
						"text": "Nope",
					}
				},
				"value": encodeAction('merge', {pr_id: pr.id})
			},
		]
	}
}

function getCheckLine(check: CommitCheck): string {
	let emojiMapping = {
		'pending': null,
		'in_progress': '⚙️',
		'waiting_for_manual_action': '👉',
		'success': '✅',
		'failure': '🚫',
	}

	let textMapping = {
		'pending': null,
		'in_progress': 'is in progres...',
		'waiting_for_manual_action': 'needs your action 👈',
		'success': 'is done',
		'failure': 'failed',
	}

	return `${emojiMapping[check.status]} < ${check.targetUrl} | ${check.name} ${textMapping[check.status]} >`
}

function getPiplineCheckBlock(pr: PullRequest, pipeline: CommitCheck, pipelineStatus: string): IMessgeBlock {
	return {
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": `*⚙️ <${pipeline.targetUrl} | ${pipeline.name}> is in progres...* \n        ✅ <https://google.com| Job #1> is done \n        ⚙️ <https://google.com| Job #1> is in progres... \n        🚫 <https://google.com| Job #1> failed \n        👉 <https://google.com| Job #1> needs your action 👈`
		},
		"accessory": {
			"type": "overflow",
			"options": [
				{
					"text": {
						"type": "plain_text",
						"text": "Stop the pipe-line run",
						"emoji": true
					},
					"value": "value-0"
				},
				{
					"text": {
						"type": "plain_text",
						"text": "Re-run the estimation",
						"emoji": true
					},
					"value": "value-1"
				}
			]
		}
	}
}

function getChecksBlocks(pr: PullRequest, checks: CommitCheck[]): IMessgeBlock[] {
	return [{
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": `function getChecksBlocks(pr: PullRequest, checks: CommitCheck[]): IMessgeBlock[]`
		},
	}]
}

function getMergedBlock(mergedAt: string) {
		return {
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": `_Merged at ${mergedAt}_`
		},
	}
}

function getDivider(): IMessgeBlock {
	return {
		"type": "divider"
	}
}

function getReviewsStatusBlock(pr: PullRequest, requests: PullRequestReviewRequest[], reviews: PullRequestReview[]): IMessgeBlock[] {
	function buildBlock(status: string, reviewer: string, reviewerLink: string, link: string, actionData: {}): IMessgeBlock {
		return {
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": `<http://${reviewerLink}|${reviewer}> ${status}`
			},
			"accessory": {
				"type": "button",
				"text": {
					"type": "plain_text",
					"text": "Re-request",
					"emoji": true
				},
				"value": encodeAction('review_asigne', actionData)
			}
		}
	}

	const assigneeBlocks: {[key: string]: IMessgeBlock} = {}

	reviews.forEach(item => {
		const states = {
			'commented': '💬 Commented',
			'changes_requested': '🤔 Changes requested',
			'approved': '✅ Approved',
		}
		assigneeBlocks[item.reviewUsername] = buildBlock(states[item.state], item.reviewUsername, item.reviewUsername, pr.websiteUrl, {pr_id: pr.id, user: item.reviewUsername})
	})

	requests.forEach(item => {
		if (!item.review) {
			assigneeBlocks[item.reviewUsername] = buildBlock('⏳ _waiting..._', item.reviewUsername, item.reviewUsername, pr.websiteUrl, {pr_id: pr.id, user: item.reviewUsername})
		}
	})

	const blocks = Object.values(assigneeBlocks)
	blocks.unshift({
		"type": "context",
		"elements": [
			{
				"type": "mrkdwn",
				"text": "Review assigned to:"
			}
		]
	})
	return blocks
}

export async function getPrMessage(pr: PullRequest, checks: CommitCheck[] = []): Promise<IMessageData> {	
	const open = pr.state == 'open'
	const showChecks = checks.length > 0
	const merged = !!pr.rawData.raw_data.merged_at
	const repo = await pr.relation('repository')

	const reviews = await PullRequestReview.find({where: {pullRequest: pr}, relations: ['reviewRequest'], order: {createdAt: "DESC"}})
	const requests = await PullRequestReviewRequest.find({where: {pullRequest: pr}, relations: ['review']})

	let blocks = [
		getBaseBlock(pr, repo),
		open && showChecks && getChecksBlocks(pr, checks),
		open && showChecks && getDivider(),
		open && getReviewsStatusBlock(pr, requests, reviews),
		open && getActionBlocks(pr),
		merged && getMergedBlock(pr.rawData.raw_data.merged_at)
	]
	return {
		"text": "Pull Request opened",
		"blocks": blocks.filter(Boolean).flat()
	}
};

export function getChecksSuccessMessage(checks: CommitCheck[]): IMessageData {
	return {
		"text": "✅ All checks were sucessfull",
		"blocks": [
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": "✅ All checks were sucessfull"
				}
			}
		]
	}
}

export function getCheckErrorMessage(check: CommitCheck): IMessageData {
	let linkOrName = check.targetUrl ? `<${check.targetUrl}|${check.rawData.context}>` : check.rawData.context;

	let errorText = `⛔️ *There was an error in the ${linkOrName}.*`;

	return {
		"text": errorText,
		"blocks": [
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": errorText
				}
			}
		]
	}
}

export function getReviewMessage(review: PullRequestReview, reviewUsername: string): IMessageData {
	let notificationText = `🎉 *${reviewUsername}* approved your PR <${review.pullRequest.websiteUrl}|#${review.pullRequest.prNumber}>`;

	if (review.state === 'changes_requested') {
		notificationText = `🚧 *${reviewUsername}* requested changes - <${review.pullRequest.websiteUrl}|#${review.pullRequest.prNumber}>`
	}

	if (review.state === 'commented') {
		notificationText = `🧐 *${reviewUsername}* commented on your PR <${review.pullRequest.websiteUrl}|#${review.pullRequest.prNumber}>`
	}

	return {
		'text': notificationText
	}
}

export function getReviewRequestNotification(reviewRequest: PullRequestReviewRequest, requesterUsername: string, existing: boolean): IMessageData {
	let text = 'requested';

	if (existing) {
		text = 're-requested'
	}

	return {
		'text': `@${requesterUsername} ${text} review on PR <${reviewRequest.pullRequest.websiteUrl}|#${reviewRequest.pullRequest.prNumber}>`
	}
}
