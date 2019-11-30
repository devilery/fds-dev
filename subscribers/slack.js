const request = require('superagent');


async function authenticated(data) {

	const rqeData = {
		'client_id': '7093049764.854725724224',
		'client_secret': '71c417c6614e9380f3fe48278f6438dc',
		'code': data['code']
	}

	console.log('https://slack.com/api/oauth.access');

	const res = await request.post('https://slack.com/api/oauth.access')
		.set('Content-Type', 'application/json')
		.send(JSON.stringify(rqeData))

	console.log('done');

	console.log(res);
}

module.exports = {
	'authenticated': authenticated,
}