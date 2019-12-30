import { ICommitCheck } from '../events/types';
import { User, PullRequest, CommitCheck, PullRequestReview, PullRequestReviewRequest } from '../entity'

export interface IMessageData {
	text: string
	blocks?: IMessgeBlock[]
}

interface IMessgeBlock {
	type: 'section'| 'context',
	text?: string | { type: 'mrkdwn' | 'plain_text', text: string}
	blocks?: []
	accessory?: {
		type: string
		text: string | { type: 'mrkdwn' | 'plain_text', text: string, emoji: boolean}
		value: string
		confirm: {},
	}
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

function getBaseBlock(pr: PullRequest): IMessgeBlock {
	return {
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": `🧐 *PR*: #${pr.prNumber} | <${pr.websiteUrl}| ${pr.title}>`
		}
	}
}

function getReviewAssigneBlock(pr: PullRequest): IMessgeBlock {
	return {
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": "Assign review"
		},
		"accessory": {
			"type": "button",
			"text": {
				"type": "plain_text",
				"text": "Assign review 📝",
				"emoji": true
			},
			"value": `review_assigne_${pr.id}`
		}
	}
}

function getMergeBlock(pr: PullRequest): IMessgeBlock {
	return {
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": "Merge PR"
		},
		"accessory": {
			"type": "button",
			"text": {
				"type": "plain_text",
				"text": "Merge PR 💣",
				"emoji": true
			},
			"confirm": {
				"title": {
					"type": "plain_text",
					"text": "confirm merge",
				},
				"text": {
					"type": "plain_text",
					"text": `do you really want to merge PR #${pr.prNumber} ${pr.title}?`
				},
				"confirm": {
					"type": "plain_text",
					"text": "Merge please",
				},
				"deny": {
					"type": "plain_text",
					"text": "Abort merge",
				}
			},
			// "value": `merge___${encodeURIComponent(JSON.stringify({'pr': pr.id}))}`
			"value": encodeAction('merge', {pr: pr.id})
		}
	}
}

function getCheckProgressBlock(checks: CommitCheck[]): IMessageData[] | [] {
	if (checks.length === 0)
		return []

	let pendingChecks = checks.filter(item => item.status === 'pending')

	return [
		{
			"type": "context",
			"elements": [
				{
					"type": "mrkdwn",
					"text": `*Pull request checks* (${checks.filter(item => item.status !== 'pending').length} complete out of ${checks.length})`
				}
			]
		},
		pendingChecks.map(item => {
			let checkName = item.name;

			let linkOrName = item.targetUrl ? `<${item.targetUrl}|${checkName}>` : checkName;
			let text = `⏳Check ${linkOrName} in progress...`;

			// if (item.ciData && item.ciData.estimate_ms) {
			// 	text += ` ${item.ciData.estimate_ms / 1000}s est build time`
			// }

			return {
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": text
				}
			}
		})
	].flat()
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

export function getPrMessage(pr: PullRequest, checks: CommitCheck[] = []): IMessageData {
	const open = pr.rawData.raw_data.state === 'open';
	const merged = !!pr.rawData.raw_data.merged_at;
	let blocks = [
		getBaseBlock(pr),
		open && getReviewAssigneBlock(pr),
		open && getMergeBlock(pr),
		open && getCheckProgressBlock(checks),
		merged && getMergedBlock(pr.rawData.raw_data.merged_at)
	]
	return {
		"text": "Pull Request opened",
		"blocks": blocks.filter(Boolean).flat()
	}
};

export function getChecksSuccessMessage(checks: CommitCheck[]): IMessageData {
	var blocks: IMessgeBlock[] = checks.map(item => {
		let linkOrName = item.targetUrl ? `<${item.targetUrl}|${item.rawData.context}>` : item.rawData.context;

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
	let linkOrName = check.targetUrl ? `<${check.targetUrl}|${check.rawData.context}>` : check.rawData.context;

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

export function getReviewMessage(review: PullRequestReview): IMessageData {
	let notificationText = `🎉 *${review.reviewUserName}* approved your PR <${review.pullRequest.websiteUrl}|#${review.pullRequest.prNumber}>`;

	if (review.state === 'changes_requested') {
		notificationText = `🚧 *${review.reviewUserName}* requested changes - <${review.pullRequest.websiteUrl}|#${review.pullRequest.prNumber}>`
	}

	if (review.state === 'commented') {
		notificationText = `🧐 *${review.reviewUserName}* commented on your PR <${review.pullRequest.websiteUrl}|#${review.pullRequest.prNumber}>`
	}

	return {
		'text': notificationText
	}
}

export function getReviewRequestNotification(reviewRequest: PullRequestReviewRequest, requesterUsername: string): IMessageData {
	return {
		'text': `@${requesterUsername} request review on PR #<${reviewRequest.pullRequest.websiteUrl}|#${reviewRequest.pullRequest.prNumber}>`
	}
}
