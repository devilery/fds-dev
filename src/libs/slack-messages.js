const { sendMessage } = require('./slack-api.js')

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

let checkProgressBlock = (data) => [
	{
	"type": "context",
	"elements": [
		{
			"type": "mrkdwn",
			"text": "*CI build in progress*"
		}
	]
	},
	{
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": "⏳ Estimated build time: *13mins* \n⚠️ <https://google.com| CI build> needs your attention. Check the thread bellow ⬇️.\n"
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
]

let footerBlock = (data) => [{
	"type": "section",
	"text": {
		"type": "mrkdwn",
		"text": "<https://google.com|Git Hub> | <https://google.com|Trello> | <https://google.com|CI >"
	}
}]


async function sendWelcomeMessage(channel, token) {
	data = {
		'channel': channel,
		'text': 'Ahoj'
	}

	return sendMessage(data, token)
};

async function sendPrOpenedMessage(data, channel, token) {
	data = {
		"channel": channel,
		"blocks": [
			baseBlock(data),
			checkProgressBlock(data),
			footerBlock
		]
	}

	return sendMessage(data, token)
};

async function sendCheckSucess(data, channel, token) {
	let sucessText = `✅ *The <${data.target_url}|check> was successful!*`;

	if (data.type === 'ci-circleci') {
		sucessText = `✅ *The <${data.target_url}|pipeline run> was successful!*`;
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
}


module.exports = { sendMessage, sendPrOpenedMessage, sendWelcomeMessage, sendCheckSucess, sendCheckError }
