const { firestore } = require('../libs/firebase')
const { sendWelcomeMessage } = require('../libs/slack-messages');


const teamCreated = async function(data) {

}
teamCreated.eventType = 'team.created'


const userCreated = async function(user) {
	const team = await user.team.get()
	if (!team.githubConnected) {
		sendWelcomeMessage(user.slackImChannelId, team.data().botAccessToken)
	}
}
userCreated.eventType = 'user.created'


module.exports = [teamCreated, userCreated]
