import { ICommitCheck } from '../events/types';
import { User, PullRequest, CommitCheck } from '../entity'

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
	}
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
			"text": "Assigne review"
		},
		"accessory": {
			"type": "button",
			"text": {
				"type": "plain_text",
				"text": "Assigne review",
				"emoji": true
			},
			"value": `review_assigne_${pr.id}`
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

export function getPrMessage(pr: PullRequest, checks: CommitCheck[] = []): IMessageData {
	let blocks = [[getBaseBlock(pr)], getReviewAssigneBlock(pr), getCheckProgressBlock(checks)]
	return {
		"text": "Pull Request opened",
		"blocks": blocks.flat()
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