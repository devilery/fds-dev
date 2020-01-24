import httpContext from 'express-http-context'
import { ICommitCheck } from '../events/types';
import { User, PullRequest, CommitCheck, PullRequestReview, PullRequestReviewRequest, Repository, ReviewInvite, Pipeline, Team } from '../entity'
import { detectPipelineMasterStatus } from './circleci';

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
		return { text: `Hi :wave:, please connect your <${authLink}|GitHub account> to use the HappyShip.` }
	} else {
		let authLink = process.env.GH_APP_INSTAL_URL + `?state=${user.team.id}`
		return { text: `Welcome :raised_hand_with_fingers_splayed:, please install our <${authLink}|GitHub app> to use the HappyShip. P.S. admin rights are needed, if you don’t have them, please ping you admin. See you soon!` }
	}
}

export function getReviewRegisterMessage(user: User, authorSlackUsername: string): IMessageData {
	let authLink = process.env.GH_OAUTH_URL + `?userId=${user.id}`
	return { text: `Hi :wave:, @${authorSlackUsername} request a review on his pull request. Please connect your <${authLink}|GitHub account> to get started with HappyShip.` }
}

function getBaseBlock(pr: PullRequest, repo: Repository): IMessgeBlock {
	const state = pr.rawData.raw_data.state; //open, closed
	const merged = pr.rawData.raw_data.merged;

	const finalState = state === 'open'
		? 'Open'
		: merged ? 'Merged' : 'Closed';
	const finalStateColor = state === 'open'
		? 'primary'
		: merged ? undefined : 'danger';

	return {
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": `*PR #${pr.prNumber}: <${pr.websiteUrl}|${pr.title}>* in _<${repo.websiteUrl}|${repo.name}>_`
		},
		"accessory": {
			"type": "button",
			"text": {
				"type": "plain_text",
				"text": `PR: ${finalState}`,
				"emoji": true,
			},
			"url": pr.websiteUrl,
			"style": finalStateColor,
		}
	}
}

function isFeatureFlagEnabled(user, team, flagName) {
	return Boolean(team?.featureFlags[flagName] || user?.featureFlags[flagName]);
}

function getActionBlocks(pr: PullRequest, user: User, team: Team): IMessgeBlock {
	const mergeFlag = isFeatureFlagEnabled(user, team, 'merge_button');
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
			mergeFlag && {
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
						"text": "Yes",
					},
					"deny": {
						"type": "plain_text",
						"text": "No",
					}
				},
				"value": encodeAction('merge', {pr_id: pr.id})
			},
		].filter(Boolean)
	}
}

function getCheckLine(check: CommitCheck, pipeline: Pipeline | null): string {
	let mapping = {
		'pending': ['is pending...', '⏳'],
		'blocked': ['is blocked...', '🚧'],
		'in_progress': ['is running...', '⚙️'],
		'waiting_for_manual_action': [`requires your action  👈`, '👉'],
		'success': ['is done', '✅'],
		'failure': ['failed', '🚫'],
	}
	if (pipeline) {
		mapping['waiting_for_manual_action'] = [`<${pipeline.url}|requires your action>  👈`, '👉']
	}

	const name = check.name.replace('ci/circleci: ', '')
	let text = check.targetUrl ? `<${check.targetUrl}|${name}>` : `${name}`

	if (!Object.keys(mapping).includes(check.status)) {
		console.log(`fuck: ${check.status}`)
	}

	return `${mapping[check.status][1]} ${text} _${mapping[check.status][0]}_`
}

function getChecksBlocks(pipeline: Pipeline | undefined, checks: CommitCheck[], ciStatus: 'running' | 'failed' | 'success' | null): IMessgeBlock[] {
	const sorting = {
		'success': 1,
		'failure': 2,
		'blocked': 3,
		'waiting_for_manual_action': 4,
		'pending': 5,
		'in_progress': 6,
	}

	checks = checks.sort((a, b) => {
		if (sorting[a.status] > sorting[b.status]) {
			return -1
		} else if (sorting[a.status] < sorting[b.status]) {
			return 1
		}
		return a.name.localeCompare(b.name, 'en', {sensitivity: 'base'})
 	});

	const blocks: IMessgeBlock[] = []

	// All checks passed, show just "All check were successful" message
	if (checks.every(check => check.status == 'success')) {
		return [{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": '✅ All check were successful'
			}
		}]
	}

	// CI Pipline checks are present, group them
	if (ciStatus) {
		const messages = {
			'running': ['is running...', '⚙️'],
			'failed': ['failed', '🚫'],
			'success': ['is done', '✅'],
		}

		let ciLines = `${messages[ciStatus][1]} <${pipeline.url}|CI Pipeline> ${messages[ciStatus][0]}`

		if (ciStatus !== 'success' && !checks.filter(item => (item.type == 'ci-circleci')).every(check => { check.status == 'success' })) {
			const filter: string[] = []
			if (ciStatus == 'success') {
				filter.push('waiting_for_manual_action')
			}
			if (ciStatus == 'failed') {
				filter.push('waiting_for_manual_action')
				filter.push('failure')
			}
			if (ciStatus == 'running') {
				filter.push('in_progress')
				filter.push('waiting_for_manual_action')
				filter.push('success')
				filter.push('failure')
			}

			checks.filter(item => (item.type == 'ci-circleci')).forEach(item => {
				ciLines += `\n        ` + getCheckLine(item, pipeline)
			})
		}

		blocks.push({
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ciLines
			}
		})
	}

	// write out ther (non CI) checks
	checks.filter(item => (item.type != 'ci-circleci')).forEach(item => {
		blocks.push({
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": getCheckLine(item, null)
			}
		})
	})

	return blocks
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

async function getReviewsStatusBlock(pr: PullRequest, requests: PullRequestReviewRequest[], reviews: PullRequestReview[], invites: ReviewInvite[]): Promise<IMessgeBlock[]> {
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
				"value": encodeAction('review_reassign', actionData)
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
		if (item.reviews.length === 0) {
			assigneeBlocks[item.reviewUsername] = buildBlock('⏳ _Waiting for the review..._', item.reviewUsername, item.reviewUsername, pr.websiteUrl, {pr_id: pr.id, user: item.reviewUsername})
		}
	})

	for (let invite of invites) {
		let username = await invite.user.getSlackUsername()

		assigneeBlocks[username] = {
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": `@${username} ⏳ _Invitation to connect GitHub with HappyShip sent_`
			},
		}
	}

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
	const user = httpContext.get('user');
	const team = httpContext.get('team');
	const repo = await pr.relation('repository')

	
	const open = pr.state == 'open'
	const merged = !!pr.rawData.raw_data.merged_at

	const showChecks = team && user && checks.length > 0 && isFeatureFlagEnabled(user, team, 'ci_checks');
	const showMerge = team && user && checks.length > 0 && isFeatureFlagEnabled(user, team, 'ci_checks');

	const reviews = await PullRequestReview.find({where: {pullRequest: pr}, relations: ['reviewRequest'], order: {createdAt: 'ASC'}})
	const requests = await PullRequestReviewRequest.find({where: {pullRequest: pr}, relations: ['reviews']})
	const invites =  await ReviewInvite.find({ where: { pullRequest: pr }, relations: ['user']})
	const pipeline = await pr.getHeadPipeline();

	let ciStatus: string | null = null
	if (checks.filter(item => item.type == 'ci-circleci').length > 0) {
		ciStatus = (await detectPipelineMasterStatus(pr))[0]
	}

	let blocks = [
		getBaseBlock(pr, repo),
		open && getChecksBlocks(pipeline, checks, ciStatus),
		open && getDivider(),
		open && (reviews.length || requests.length || invites.length) && await getReviewsStatusBlock(pr, requests, reviews, invites),
		open && getActionBlocks(pr, user, team),
		showMerge && !merged && getMergedBlock(pr.rawData.raw_data.merged_at)
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
		notificationText = `🚧 *${reviewUsername}* requested changes on your PR <${review.pullRequest.websiteUrl}|#${review.pullRequest.prNumber}>`
	}

	if (review.state === 'commented') {
		notificationText = `🧐 *${reviewUsername}* commented on your PR <${review.pullRequest.websiteUrl}|#${review.pullRequest.prNumber}>`
	}

	return {
		'text': notificationText
	}
}

export function getReviewRequestNotification(reviewRequest: PullRequestReviewRequest, requesterUsername: string, existing: boolean): IMessageData {
	return {
		"text": `@${requesterUsername} requested review on PR <${reviewRequest.pullRequest.websiteUrl}|#${reviewRequest.pullRequest.prNumber}>`,
		"blocks": [
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": `👋 @${requesterUsername} requested review on *PR #${reviewRequest.pullRequest.prNumber} <${reviewRequest.pullRequest.websiteUrl}| ${reviewRequest.pullRequest.title}> *`
				}
			},
			{
				"type": "actions",
				"elements": [
					{
						"type": "button",
						"text": {
							"type": "plain_text",
							"text": "🔍  Review",
							"emoji": true
						},
						"url": reviewRequest.pullRequest.websiteUrl
					}
				]
			}
		]
	}
}
