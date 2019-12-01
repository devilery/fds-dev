const request = require('superagent');


async function sendMessage(reqData) {

	console.log('https://slack.com/api/oauth.access');

	const res = await request.post('https://slack.com/api/chat.postMessage')
		.set('Content-Type', 'application/json;charset=utf-8')
		.set('Authorization', 'Bearer xoxb-7093049764-856934218934-D96ynEZHxu4fFqVX3SpDhvPT')
		.send(JSON.stringify(reqData))

	console.log(res);
}

module.exports = {
	'sendMessage': sendMessage
}