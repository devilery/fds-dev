require('dotenv').config()
const axios = require('axios')
const request = require('superagent')


async function getAuthInfo(code, redirectUri) {
	const rqeData = {
		'client_id': process.env.SLACK_CLIENT_ID,
		'client_secret': process.env.SLACK_CLIENT_SECRET,
		'code': code,
	}

	if (redirectUri != undefined)
		rqeData.redirect_uri = data.redirect_uri

	const res = await axios.get('https://slack.com/api/oauth.access', {params: rqeData})
	const data = res.data
	return { userId: data.user_id, userAccessToken: data.access_token, botAccessToken: data.bot.bot_access_token}
}


async function getTeamInfo(accessToken) {
	const res = await axios.get('https://slack.com/api/team.info', {headers: {'Authorization': `Bearer ${accessToken}`}})
	const data = res.data
	return { id: data.team.id, name: data.team.name}
}


async function getUserInfo(accessToken, userToken) {
	const res = await axios.get('https://slack.com/api/users.info', {params: {'user': userToken}, headers: {'Authorization': `Bearer ${accessToken}`}})
	const data = res.data
	return { id: data.user.id, name: data.user.real_name }
}


async function openImChannel(accessToken, userToken) {
	const res = await axios.get('https://slack.com/api/im.open', {params: {'user': userToken},headers: {'Authorization': `Bearer ${accessToken}`}})
	const data = res.data
	return data.channel.id
}


async function sendMessage(data, accessToken) {
	console.log(data)
	const res = await request.post('https://slack.com/api/chat.postMessage')
		.set('Content-Type', 'application/json;charset=utf-8')
		.set('Authorization', `Bearer ${accessToken}`)
		.send(JSON.stringify(data))
	console.log(res.body)
}

module.exports = { getAuthInfo, getTeamInfo, getUserInfo, openImChannel, sendMessage }