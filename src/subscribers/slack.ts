const slack = require('../libs/slack-api.js')
const { emmit } = require('../libs/event.js')
import {Team, User} from '../entity'


const authenticated = async function(data: any) {
	const authInfo = await slack.getAuthInfo(data.code)
	const teamInfo = await slack.getTeamInfo(authInfo.userAccessToken)
	const userInfo = await slack.getUserInfo(authInfo.userId, authInfo.userAccessToken)

	let team = await Team.findOne({where: { slackId: teamInfo.id }})
	if (!team) {
		team = Team.create({
			slackId: teamInfo.id,
			slackBotAccessToken: authInfo.botAccessToken
		})

		await team.save()
		emmit('team.created', team)
	}

	let user = await User.findOne({where: { slackId: userInfo.id}})
	if (!user) {
		user = User.create({
			slackId: userInfo.id,
			name: userInfo.name,
			team: team,
			slackImChannelId: await slack.openImChannel(userInfo.id, authInfo.botAccessToken)
		})

		await user.save()
		emmit('user.created', user)
	}

}
authenticated.eventType = 'slack.user.authenticated'


module.exports = [authenticated]
