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
	
	return [
		{
		"type": "context",
		"elements": [
			{
				"type": "mrkdwn",
				"text": "*Pull request checks*"
			}
		]
		},
		checks.map(item => {
			let checkName = item.context;
			

			let text = `⏳Check <${item.target_url}|${checkName}> in progress...`;

			if (item.status === 'success') {
				text = `✅*<${item.target_url}|${checkName}> check is complete!*`
			}

			if (item.status === 'failure' || item.status === 'error') {
				text = `⛔️*There was an error with <${data.target_url}|${checkName}>.* check`
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

let footerBlock = (data) => [{
	"type": "section",
	"text": {
		"type": "mrkdwn",
		"text": "<https://google.com|Git Hub> | <https://google.com|Trello> | <https://google.com|CI >"
	}
}]



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
	let checks = checkProgressBlock(data.checks.filter(item => item.status === 'pending'))
	let blocks = [baseBlock(data.pr), checks]
	let dataMsg = {
		"blocks": blocks.flat(),
		"text": "sadasd"
	}

	return updateMessage(dataMsg, channel, ts, token)
}


async function sendCheckSuccess(data, channel, ts, token) {

	data = {
		"thread_ts": ts,
		"channel": channel,
		"blocks": [
			{
				"type": "context",
				"elements": [
					{
						"type": "mrkdwn",
						"text": `✅ *The <${data.target_url}|${data.context}> was successful!*`
					}
				]
			}
		]
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


module.exports = { sendMessage, sendPrOpenedMessage, sendWelcomeMessage, sendCheckSuccess, sendCheckError, updatePrOpenedMessage }
