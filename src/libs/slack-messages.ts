export function getWelcomeMessageText(githubConnected: boolean, authLink: string) {
	if (githubConnected){
		return `Welcome :raised_hand_with_fingers_splayed:, please install our <${authLink}|GitHub app> to use the Devilery. P.S. admin rights are needed, if you don’t have them, please ping you admin. See you soon!`
	} else {
		return `Hi :wave:, please connect your <${authLink}|GitHub account> to use the Devilery.`
	}
}

let baseBlock = (data) => [
	{
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": `🧐 *PR*: #${data.pr_number} | <${data.website_url}| ${data['title']}>`
		}
	}
]


let checkProgressBlock = (checks) => {
	
	let filter = checks.filter(item => item.status === 'pending')

	if (checks.length === 0) {
		return []
	}

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
		filter.map(item => {
			let checkName = item.context;
			

			let linkOrName = item.target_url ? `<${item.target_url}|${checkName}>` : checkName;
			let text = `⏳Check ${linkOrName} in progress...`;

			if (item.ci_data && item.ci_data.estimate_ms) {
				text += ` ${item.ci_data.estimate_ms / 1000}s est build time`
			}

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

async function sendPrOpenedMessage(data, channel, token) {
	let blocks = [baseBlock(data)]

	data = {
		"channel": channel,
		"text": "Pull Request opened",
		"blocks": blocks.flat()
	}

	let res = await sendMessage(data, token)
	return res.data.message.ts
};



async function updatePrOpenedMessage(data, channel, ts, token) {
	let checks = checkProgressBlock(data.checks)
	let blocks = [baseBlock(data.pr), checks]
	let dataMsg = {
		"blocks": blocks.flat(),
		"text": "sadasd"
	}

	return updateMessage(dataMsg, channel, ts, token)
}

async function sendChecksSuccess(checksData, channel, ts, token) {
	let checks = checksData.map(item => {
		let linkOrName = item.target_url ? `<${item.target_url}|${item.context}>` : item.context;

		return {
			"type": "context",
			"elements": [
				{
					"type": "mrkdwn",
					"text": `✅ *The ${linkOrName} was successful!*`
				}
			]
		}
	})

	data = {
		"thread_ts": ts,
		"channel": channel,
		"blocks": [
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": "All your Checks passed! 🎉"
				}
			},
			...checks]
	}

	return sendMessage(data, token)
}

async function sendCheckError(data, channel, token, ts) {
	let linkOrName = item.target_url ? `<${item.target_url}|${item.context}>` : item.context;

	let errorText = `⛔️ *There was an error with the ${linkOrName}.*`;

	data = {
		"thread_ts": ts,
		"channel": channel,
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

	return sendMessage(data, token)
};