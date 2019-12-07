require('dotenv').config()
const axios = require('axios')


async function getAuthInfo(code, redirectUri=true) {
	var reqData = {
		'client_id': process.env.SLACK_CLIENT_ID,
		'client_secret': process.env.SLACK_CLIENT_SECRET,
		'code': code,
	}
	if (redirectUri)
		reqData.redirect_uri = process.env.SLACK_OAUTH_REDIRECT_URI

	const res = await axios.get('https://slack.com/api/oauth.access', {params: reqData})
	const data = res.data
	return { userId: data.user_id, userAccessToken: data.access_token, botAccessToken: data.bot.bot_access_token}
}

async function getTeamInfo(accessToken) {
	const res = await axios.get('https://slack.com/api/team.info', {headers: {'Authorization': `Bearer ${accessToken}`}})
	const data = res.data
	return { id: data.team.id, name: data.team.name}
}


async function getUserInfo(userId, accessToken) {
	const res = await axios.get('https://slack.com/api/users.info', {params: {'user': userId}, headers: {'Authorization': `Bearer ${accessToken}`}})
	const data = res.data
	return { id: data.user.id, name: data.user.real_name }
}


async function openImChannel(userId, accessToken) {
	const res = await axios.get('https://slack.com/api/im.open', {params: {'user': userId}, headers: {'Authorization': `Bearer ${accessToken}`}})
	const data = res.data
	return data.channel.id
}


async function sendMessage(data, accessToken) {
	const res = await axios.post('https://slack.com/api/chat.postMessage', data, { headers: { 'Authorization': `Bearer ${accessToken}` } })
	return res
}


async function updateMessage(data, channel, ts, accessToken) {
	data.channel = channel
	data.ts = ts
	let res = await axios.post('https://slack.com/api/chat.update', data, { headers: { 'Authorization': `Bearer ${accessToken}` } })
	return res
}


module.exports = { getAuthInfo, getTeamInfo, getUserInfo, openImChannel, sendMessage, updateMessage }