import { ICommitCheck } from '../events/types';
import { User, PullRequest, CommitCheck, PullRequestReview, PullRequestReviewRequest, Repository } from '../entity'

export interface IMessageData {
	text: string
	blocks?: IMessgeBlock[]
}

interface IMessgeBlock {
	type: 'section'| 'context' | "actions"
	text?: string | { type: 'mrkdwn' | 'plain_text', text: string }
	blocks?: []
	accessory?: any
	elements?: {
		type: "button"| "users_select",
		placeholder?: {
			"type": "plain_text",
			"text": string,
			"emoji": boolean
		}
		text?: {
			type: "plain_text",
			text: string,
			emoji: boolean
		}
		value?: string,
		confirm?: any,
	}[]
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

function getReviewAssigneBlock(pr: PullRequest): IMessgeBlock {
	return {
		"type": "actions",
		"elements": [
			{
				"type": "users_select",
				"value": encodeAction('review_assign', { pr_id: pr.id }),
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
				"value": encodeAction('merge', {pr: pr.id})
			},
		]
	}
}

// function getMergeBlock(pr: PullRequest): IMessgeBlock {
// 	return {
// 		"type": "section",
// 		"text": {
// 			"type": "mrkdwn",
// 			"text": "Merge PR"
// 		},
// 		"accessory": {
// 			"type": "button",
// 			"text": {
// 				"type": "plain_text",
// 				"text": "Merge PR 💣",
// 				"emoji": true
// 			},
// 			"confirm": {
// 				"title": {
// 					"type": "plain_text",
// 					"text": "confirm merge",
// 				},
// 				"text": {
// 					"type": "plain_text",
// 					"text": `do you really want to merge PR #${pr.prNumber} ${pr.title}?`
// 				},
// 				"confirm": {
// 					"type": "plain_text",
// 					"text": "Merge please",
// 				},
// 				"deny": {
// 					"type": "plain_text",
// 					"text": "Abort merge",
// 				}
// 			},
// 			"value": encodeAction('merge', {pr: pr.id})
// 		}
// 	}
// }

function getCheckProgressBlock(checks: CommitCheck[]): IMessgeBlock {
	let pendingChecks = checks.filter(item => item.status === 'pending').length
	let doneChecks = checks.length - pendingChecks

	if (pendingChecks > 0) {
		var text = `⚙️ Check are going well so far... _(${doneChecks} of ${pendingChecks + doneChecks} checks completed)_`
	} else {
		var text = `⚙️ Check are done! _(${doneChecks} of ${pendingChecks + doneChecks} checks completed)_`
	}

	return {
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": text
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
				},
				{
					"text": {
						"type": "plain_text",
						"text": "Option 3",
						"emoji": true
					},
					"value": "value-2"
				},
				{
					"text": {
						"type": "plain_text",
						"text": "Option 4",
						"emoji": true
					},
					"value": "value-3"
				}
			]
		}
	}

	// if (checks.length === 0)
	// 	return []

	// let pendingChecks = checks.filter(item => item.status === 'pending')

	// return [
	// 	{
	// 		"type": "context",
	// 		"elements": [
	// 			{
	// 				"type": "mrkdwn",
	// 				"text": `*Pull request checks* (${checks.filter(item => item.status !== 'pending').length} complete out of ${checks.length})`
	// 			}
	// 		]
	// 	},
	// 	pendingChecks.map(item => {
	// 		let checkName = item.name;

	// 		let linkOrName = item.targetUrl ? `<${item.targetUrl}|${checkName}>` : checkName;
	// 		let text = `⏳Check ${linkOrName} in progress...`;

	// 		// if (item.ciData && item.ciData.estimate_ms) {
	// 		// 	text += ` ${item.ciData.estimate_ms / 1000}s est build time`
	// 		// }

	// 		return {
	// 			"type": "section",
	// 			"text": {
	// 				"type": "mrkdwn",
	// 				"text": text
	// 			}
	// 		}
	// 	})
	// ].flat()
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

function getDivider() {
	return {
		"type": "divider"
	}
}

export async function getPrMessage(pr: PullRequest, checks: CommitCheck[] = []): Promise<IMessageData> {
	const open = pr.state == 'open'
	const showChecks = checks.length > 0
	const merged = !!pr.rawData.raw_data.merged_at;
	const repo = await pr.relation('repository')
	let blocks = [
		getBaseBlock(pr, repo),
		open && getCheckProgressBlock(checks),
		open && getDivider(),
		open && getReviewAssigneBlock(pr),
		// open && getMergeBlock(pr),
		merged && getMergedBlock(pr.rawData.raw_data.merged_at)
	]
	return {
		"text": "Pull Request opened",
		"blocks": blocks.filter(Boolean).flat()
	}
};

export function getChecksSuccessMessage(checks: CommitCheck[]): IMessageData {
	var blocks: IMessgeBlock[] = checks.map(check => {
		let linkOrName = check.targetUrl ? `<${check.targetUrl}|${check.name}>` : check.name;

		return {
			type: "context",
			elements: [
				{
					"type": "mrkdwn",
					"text": `✅ *The ${linkOrName} was successful!*`
				}
			]
		}
	})

	return {
		"text": "Build sucessful", // TODO: make this better
		"blocks": [
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": "All your Checks passed! 🎉"
				}
			},
			...blocks]
	}
}

export function getCheckErrorMessage(check: CommitCheck): IMessageData {
	let linkOrName = check.targetUrl ? `<${check.targetUrl}|${check.name}>` : check.name;

	let errorText = `⛔️ *There was an error with the ${linkOrName}.*`;

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
