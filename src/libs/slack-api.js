require('dotenv').config()
const axios = require('axios')
const { firestore } = require('../libs/firebase')


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
	console.log(data)
	return { userId: data.user_id, userAccessToken: data.access_token, botAccessToken: data.bot.bot_access_token}
}


async function get(url, options) {
	console.log(url)
	console.log(options)
	var res = await axios.get(url, options)
	console.log(res)
	// if (['invalid_auth', 'not_authed'].includes(res.data.error)) {
	// 	const teamsRefs = await firestore.collection('teams').get()

	// 	let authTeam = null
	// 	teamsRefs.docs.map(doc => doc.data()).filter(async team => {
	// 		if (team.slack_bot_access_token == options.headers.Authorization.replace('Bearer ', ''))
	// 			authTeam = team
	// 	})
	// 	authInfo = await getAuthInfo(authTeam.slack_auth_code)
	// 	const teamRef = await firestore.collection('teams').doc(team.id).get()
	// 	await teamRef.update({slack_bot_access_token: authInfo.botAccessToken})
	// 	options.headers.Authorization = `Bearer ${authInfo.botAccessToken}`
	// 	res = await axios.get(url, options)
	// }
	return res
}


async function post(url, data, options) {
	console.log(url)
	console.log(data)
	console.log(options)
	var res = await axios.get(url, data, options)
	console.log(res)
	// if (['invalid_auth', 'not_authed'].includes(res.data.error)) {
	// 	const teamsRefs = await firestore.collection('teams').get()

	// 	let authTeam = null
	// 	teamsRefs.docs.map(doc => doc.data()).filter(async team => {
	// 		if (team.slack_bot_access_token == options.headers.Authorization.replace('Bearer ', ''))
	// 			authTeam = team
	// 	})
	// 	authInfo = await getAuthInfo(authTeam.slack_auth_code)
	// 	const teamRef = await firestore.collection('teams').doc(team.id).get()
	// 	await teamRef.update({slack_bot_access_token: authInfo.botAccessToken})
	// 	options.headers.Authorization = `Bearer ${authInfo.botAccessToken}`
	// 	res = await axios.get(url, data, options)
	// }
	return res
}


async function getTeamInfo(accessToken) {
	const res = await get('https://slack.com/api/team.info', {headers: {'Authorization': `Bearer ${accessToken}`}})
	const data = res.data
	return { id: data.team.id, name: data.team.name}
}


async function getUserInfo(userId, accessToken) {
	const res = await get('https://slack.com/api/users.info', {params: {'user': userId}, headers: {'Authorization': `Bearer ${accessToken}`}})
	const data = res.data
	return { id: data.user.id, name: data.user.real_name }
}


async function openImChannel(userId, accessToken) {
	const res = await get('https://slack.com/api/im.open', {params: {'user': userId}, headers: {'Authorization': `Bearer ${accessToken}`}})
	const data = res.data
	return data.channel.id
}


async function sendMessage(data, accessToken) {
	const res = await post('https://slack.com/api/chat.postMessage', data, { headers: { 'Authorization': `Bearer ${accessToken}` } })
	return res
}


async function updateMessage(data, channel, ts, accessToken) {
	data.channel = channel
	data.ts = ts
	let res = await post('https://slack.com/api/chat.update', data, { headers: { 'Authorization': `Bearer ${accessToken}` } })
	return res
}


module.exports = { getAuthInfo, getTeamInfo, getUserInfo, openImChannel, sendMessage, updateMessage }