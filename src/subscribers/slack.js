const firebase = require('../libs/firebase');
const slack = require('../libs/slack-api.js')
const { firestore } = require('../libs/firebase');

const authenticated = async function(data) {
	const tokens = await slack.getTokens(data.code, data.redirect_uri)
	const teamInfo = await slack.getTeamInfo(tokens.userAccessToken)
	const userInfo = await slack.getUserInfo(tokens.userAccessToken)

	let teamCreated = false
	let userCreated = false

	const team = await firestore.collection('teams').doc(teamInfo.id).get()
	if (!team.exist) {
		await team.set(teamInfo)
		teamCreated = true
	}

	const user = await firestore.collection('users').doc(userInfo.id).get()
	if (!user.exist) {
		userInfo.slackImChannelId = slack.openIm(user.slackId).channelId
		await user.set(userInfo)
		userCreated = true
	}

	if (team.githubConnected) {

	}

	if userCreated
		slack.sendWelcomeMessage(user.slackImChannelId)

}
authenticated.eventType = 'slack.user.authenticated'


module.exports = [authenticated]