const { firestore } = require('../libs/firebase')
const { sendWelcomeMessage } = require('../libs/slack-messages');


const teamCreated = async function(data) {

}
teamCreated.eventType = 'team.created'


const userCreated = async function(user) {
	let team = await user.team.get()
	team = team.data() 
	if (!team.githubConnected) {
		let redirectUrl = 
	}
	sendWelcomeMessage(team.githubConnected, 'https://google.com/', user.slackImChannelId, team.botAccessToken)
}
userCreated.eventType = 'user.created'


module.exports = [teamCreated, userCreated]
