const slack = require('../libs/slack-api.js')


const authenticated = async function(data) {
	const tokens = await slack.getTokens(data.code, data.redirect_uri)
	const teamInfo = await slack.getTeamInfo(tokens.userAccessToken)
	const userInfo = await slack.getUserInfo(tokens.userAccessToken)

	if (!teamExists(teamInfo.id)) {
		const team = createTeam(teamInfo);
	}

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