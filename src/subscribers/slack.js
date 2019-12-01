const firebase = require('../libs/firebase');
const slack = require('../libs/slack-api.js')
const { firestore } = require('../libs/firebase');

const authenticated = async function(data) {
	const tokens = await slack.getTokens(data.code, data.redirect_uri)
	const teamInfo = await slack.getTeamInfo(tokens.userAccessToken)
	const userInfo = await slack.getUserInfo(tokens.userAccessToken)


	let team_created = false
	let user_created = false

	const team = await firestore.collection('teams').doc(teamInfo.id).get()
	if (!team.exist) {
		await team.set(teamInfo)
		team_created = true
	}

	const user = await firestore.collection('users').doc(userInfo.id).get()
	if (!userExist(userInfo.email)) {
		const user = createUser(userInfo);
		user.slackImChannelId = slack.openIm(user.slackId).channelId
		user.save()

		slack.sendWelcomeMessage(user.slackImChannelId)
	}

	if (team.githubConnected) {

	}

}
authenticated.eventType = 'slack.user.authenticated'


module.exports = [authenticated]