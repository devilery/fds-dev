const { sendMessage } = require('./slack-api.js')

async function sendWelcomeMessage(channel, accessToken) {
	data = {
		'channel': channel,
		'text': 'Ahoj'
	}

	return sendMessage(data, accessToken)
};

async function sendPrOpenedMessage(data, channel, accessToken) {
	data = {
		"channel": channel,
		"blocks": [
			{
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
					"text": `*Monitoring PR <${data.website_url}| #${data.pr_number} ${data.title}>`
				}
			},
			{
				"type": "divider"
			},
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
			},
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": "<https://google.com|Git Hub> | <https://google.com|Trello> | <https://google.com|CI >"
				}
			}
		]
	}

	return sendMessage(data, accessToken)
};


module.exports = { sendMessage, sendPrOpenedMessage, sendWelcomeMessage }
