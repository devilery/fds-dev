const { sendMessage, updateMessage } = require('./slack-api.js')


async function sendWelcomeMessage(githubConnected, authLink, channel, accessToken) {
	if (githubConnected){
		var text = `Welcome :raised_hand_with_fingers_splayed:, please install our <${authLink}|GitHub app> to use the Devilery. P.S. admin rights are needed, if you don’t have them, please ping you admin. See you soon!`
	} else {
		var text = `Hi :wave:, please connect your <${authLink}|GitHub account> to use the Devilery.`
	}

	data = {
		'channel': channel,
		'text': text
	}

	return sendMessage(data, accessToken)
};

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
			

			let text = `⏳Check <${item.target_url}|${checkName}> in progress...`;

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

async function sendCiBuildSuccess(checksData, channel, ts, token) {

	let checks = checksData.map(item => {
		return {
			"type": "context",
			"elements": [
				{
					"type": "mrkdwn",
					"text": `✅ *The <${item.target_url}|${item.context}> was successful!*`
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
					"text": "All your CI builds passed!"
				}
			},
			...checks]
	}

	return sendMessage(data, token)
}

async function sendChecksSuccess(checksData, channel, ts, token) {
	let checks = checksData.map(item => {
		return {
			"type": "context",
			"elements": [
				{
					"type": "mrkdwn",
					"text": `✅ *The <${item.target_url}|${item.context}> was successful!*`
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

	let errorText = `⛔️ *There was an error with the <${data.target_url}|${data.context}>.*`;

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


module.exports = { sendMessage, sendPrOpenedMessage, sendWelcomeMessage, sendCiBuildSuccess, sendCheckError, updatePrOpenedMessage, sendChecksSuccess }
