require('dotenv').config()
const axios = require('axios')
const request = require('superagent')


async function getTokens(code, redirectUri) {
	const rqeData = {
		'client_id': process.env.SLACK_CLIENT_ID,
		'client_secret': process.env.SLACK_CLIENT_SECRET,
		'code': code,
	}

	if (redirectUri != undefined)
		rqeData.redirect_uri = data.redirect_uri

	const res = await axios.get('https://slack.com/api/oauth.access', {params: rqeData})
	return { userAccessToken: res.access_token, botAccessToken: res.bot.bot_access_token}
}


async function getTeamInfo(accessToken) {
	const res = await axios.get('https://slack.com/api/team.info', {headers: {'Authorization': `Bearer ${accessToken}`}})
	return { id: res.team.id, name: res.team.name}
}


async function getUserInfo(accessToken) {
	const res = await axios.get('https://slack.com/api/identity.email', {headers: {'Authorization': `Bearer ${accessToken}`}})
	return { id: res.user.id, email: res.user.email, name: res.user.name }
}

async function openIm(data, userToken) {
	const res = await axios.get('https://slack.com/api/users.profile.get', {params: {'user': userToken},headers: {'Authorization': `Bearer ${accessToken}`}})
	return { channelId: channel.id }
}

async function sendMessage(data, token) {
	return request.post('https://slack.com/api/chat.postMessage')
		.set('Content-Type', 'application/json;charset=utf-8')
		.set('Authorization', `Bearer ${token}`)
		.send(JSON.stringify(data))
}

module.exports = { getTokens, getTeamInfo, getUserInfo, sendMessage }