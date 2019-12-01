const { firestore } = require('../libs/firebase')
const { sendWelcomeMessage } = require('../libs/slack-messages');


const teamCreated = async function(data) {

}
teamCreated.eventType = 'team.created'


const userCreated = async function(user) {
	let team = await user.team.get()
	team = team.data()
	if (!team.githubConnected) {
		var redirectUrl = process.env.GH_APP_INSTAL_URL + `?state=${team.id}`
	} else {
		var redirectUrl = process.env.APP_BASE_URL + `/fds/github-login?userId=${user.id}`
	}
	sendWelcomeMessage(team.githubConnected, redirectUrl, user.slackImChannelId, team.botAccessToken)
}
userCreated.eventType = 'user.created'


module.exports = [teamCreated, userCreated]
