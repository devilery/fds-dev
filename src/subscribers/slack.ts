const slack = require('../libs/slack-api.js')
const { emmit } = require('../libs/event.js')
import {Team, User} from '../entity'


const authenticated = async function(data) {
	const authInfo = await slack.getAuthInfo(data.code)
	const teamInfo = await slack.getTeamInfo(authInfo.userAccessToken)
	const userInfo = await slack.getUserInfo(authInfo.userId, authInfo.userAccessToken)

	var currentTeam: Team | null = await Team.findOne({where: { slackId: teamInfo.id }})

	if (!currentTeam) {
		currentTeam = new Team()
		currentTeam.slackId = teamInfo.id
		currentTeam.slackBotAccessToken = authInfo.botAccessToken

		await currentTeam.save()
		emmit('team.created', currentTeam)
	}


	var currentUser: User | null = await User.findOne({where: { slackId: userInfo.id}})
	if (!currentUser) {
		currentUser = new User()
		currentUser.team = currentTeam
		currentUser.slackImChannelId = await slack.openImChannel(userInfo.id, authInfo.botAccessToken)

		await currentUser.save()
		emmit('user.created', currentUser)
	}

}
authenticated.eventType = 'slack.user.authenticated'


module.exports = [authenticated]
