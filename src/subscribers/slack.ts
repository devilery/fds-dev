// @ts-ignore
import { strict as assert } from 'assert';

const slack = require('../libs/slack-api.js')
const { emmit } = require('../libs/event.js')
import { Team, User } from '../entity'
import { WebClient } from '@slack/web-api'
import { OauthAccessResult, UsersInfoResult, TeamInfoResult } from '../libs/slack-api'
import { SlackUserAuthenticatedEventData } from '../api/slack-oauth-webhook'


const authenticated = async function(data: SlackUserAuthenticatedEventData) {
	const authInfo = await (new WebClient()).oauth.access({
		client_id: process.env.SLACK_CLIENT_ID,
		client_secret: process.env.SLACK_CLIENT_SECRET,
		redirect_uri: process.env.SLACK_OAUTH_REDIRECT_URI,
		code: data.code
	}) as OauthAccessResult;
	assert(authInfo.ok, 'Fetching auth info failed!')

	const client = new WebClient(authInfo.access_token)

	const teamInfo = await client.team.info() as TeamInfoResult
	assert(teamInfo.ok, 'Fetching team info failed!')

	const userInfo = await client.users.info() as UsersInfoResult
	assert(teamInfo.ok, 'Fetching team info failed!')

	let team = await Team.findOne({where: { slackId: teamInfo }})
	if (!team) {
		team = Team.create({
			slackId: teamInfo.team.id,
			slackBotAccessToken: authInfo.bot.bot_access_token
		})

		await team.save()
		emmit('team.created', team)
	}

	let user = await User.findOne({where: { slackId: userInfo.id}})
	if (!user) {
		user = User.create({
			slackId: userInfo.user.id,
			name: userInfo.user.real_name,
			team: team,
			slackImChannelId: await slack.openImChannel(userInfo.id, authInfo.botAccessToken)
		})

		await user.save()
		emmit('user.created', user)
	}
}
authenticated.eventType = 'slack.user.authenticated'


module.exports = [authenticated]
