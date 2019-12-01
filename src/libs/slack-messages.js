const { sendMessage } = require('./slack-api.js')


async function sendWelcomeMessage(githubConnected, authLink, channel, accessToken) {
	if (githubConnected){
		var text = `Welcome, please connect your Github account using this <${authLink}|link>.`
	} else {
		var text = `Welcome, please install our Github app to your organization using this <${authLink}|link>. Please ping the GH organization admin if need as admin right are required to do this action.`
	}

	data = {
		'channel': channel,
		'text': text
	}

	return sendMessage(data, token)
};


let baseBlock = (data) => [{
	"type": "context",
	"elements": [
		{
			"type": "mrkdwn",
			"text": "*Pull request*"
		}
	]
},
	{
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": `*Monitoring pull-request <https://google.com| ${data['title']}> * \n_*ID*_: ${data['pr_number']}`
		}
	},
	{
		"type": "divider"
	}
]


let checkProgressBlock = (data) => {
	
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
		data.map(item => {
			let checkName = item.type === 'ci-circleci' ? item.context : item.name;
			

			let text = `⏳Check <${item.target_url}|${checkName}> in progress...` + item.type === 'ci-circleci' ? ` (EST. time: ${item.ci_data.estimate_ms / 1000} seconds)` : '';

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
	let blocks = [baseBlock(data), footerBlock(data)]

	data = {
		"channel": channel,
		"blocks": blocks.flat()
	}

	return await sendMessage(data, token).body.message.ts
};


async function updateMainMessage(data, channel, token) {
	let blocks = [baseBlock(data.pr), checkProgressBlock(data.checks), footerBlock(data.pr)]

	data = {
		"blocks": blocks.flat()
	}

	return sendMessage(data, channel, token)
}


async function sendCheckSuccess(data, channel, token) {
	let sucessText = `✅ *The <${data.target_url}|${data.name}> was successful!*`;

	if (data.type === 'ci-circleci') {
		sucessText = `✅ *The <${data.target_url}|${data.context}> pipeline run was successful!*`;
	}

	data = {
		"blocks": [
			{
				"type": "context",
				"elements": [
					{
						"type": "mrkdwn",
						"text": "🖐 *Status update*"
					}
				]
			},
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": sucessText
				},
				"accessory": {
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Assign review",
						"emoji": true
					},
					"value": "click_me_123"
				}
			}
		]
	}

	return sendMessage(data, token)
}


async function sendCheckError(data, channel, token) {

	let errorText = `⛔️ *There was an error with the <${data.target_url}|${data.name}>.*`;

	if (data.type === 'ci-circleci') {
		errorText = `⛔️ *There was an error with the <${data.target_url}|${data.context}> pipeline run.*`;
	}

	data = {
		"blocks": [
			{
				"type": "context",
				"elements": [
					{
						"type": "mrkdwn",
						"text": "🖐 *Status update*"
					}
				]
			},
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": errorText
				},
				"accessory": {
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Re-run pipeline",
						"emoji": true
					},
					"value": "click_me_123"
				}
			}
		]
	}

	return sendMessage(data, token)
};


module.exports = { sendMessage, sendPrOpenedMessage, sendWelcomeMessage, sendCheckSuccess, sendCheckError, updateMainMessage }
