const request = require('superagent');

async function sendMessage(data, token) {
	const res = await request.post('https://slack.com/api/chat.postMessage')
		.set('Content-Type', 'application/json;charset=utf-8')
		.set('Authorization', `Bearer ${token}`)
		.send(JSON.stringify(data));

		console.log(res.body);

		return res;
}

async function sendPrOpenedMessage(data, channel, token) {
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
					"text": `*Monitoring pull-request <https://google.com| ${data['title']}> * \n_*ID*: ${data['pr_number']}`
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

	sendMessage(data, token);
};


module.exports = { sendMessage, sendPrOpenedMessage };