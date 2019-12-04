const firebase = require('../libs/firebase')
const slack = require('../libs/slack-api.js')
const { firestore } = require('../libs/firebase')
const { emmit } = require('../libs/event.js')


const authenticated = async function(data) {
	const authInfo = await slack.getAuthInfo(data.code)
	const teamInfo = await slack.getTeamInfo(authInfo.userAccessToken)
	const userInfo = await slack.getUserInfo(authInfo.userId, authInfo.userAccessToken)

	const teamRef = await firestore.collection('teams').doc(teamInfo.id)
	const team = teamRef.get()
	if (!team.exists) {
		teamInfo.slack_bot_access_token = authInfo.botAccessToken

		await teamRef.set(teamInfo)
		emmit('team.created', teamInfo)
	}

	const userRef = await firestore.collection('users').doc(userInfo.id)
	const user = await userRef.get()
	if (!user.exists) {
		userInfo.team = teamRef
		userInfo.slack_im_channel_id = await slack.openImChannel(user.id, authInfo.botAccessToken)

		await userRef.set(userInfo)
		emmit('user.created', userInfo)
	}

}
authenticated.eventType = 'slack.user.authenticated'


module.exports = [authenticated]
