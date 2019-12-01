const firebase = require('../libs/firebase')
const slack = require('../libs/slack-api.js')
const { firestore } = require('../libs/firebase')
const { emmit } = require('../libs/event.js')


const authenticated = async function(data) {
	const authInfo = await slack.getAuthInfo(data.code, data.redirect_uri)
	const teamInfo = await slack.getTeamInfo(authInfo.userAccessToken)
	const userInfo = await slack.getUserInfo(authInfo.userAccessToken, authInfo.userId)

	const teamRef = await firestore.collection('teams').doc(teamInfo.id)
	const team = teamRef.get()
	if (!team.exist) {
		teamInfo.botAccessToken = authInfo.botAccessToken

		await teamRef.set(teamInfo)
		emmit('team.created', teamInfo)
	}

	const userRef = await firestore.collection('users').doc(userInfo.id)
	const user = await userRef.get()
	if (!user.exist) {
		userInfo.team = teamRef
		userInfo.slackImChannelId = await slack.openImChannel(authInfo.botAccessToken, user.id)

		await userRef.set(userInfo)
		emmit('user.created', userInfo)
	}

}
authenticated.eventType = 'slack.user.authenticated'


module.exports = [authenticated]
