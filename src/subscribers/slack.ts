// @ts-ignore
import { strict as assert } from 'assert';
import { emmit } from '../libs/event.js'
import { Team, User } from '../entity'
import { WebClient } from '@slack/web-api'
import { OauthAccessResult, UsersInfoResult, TeamInfoResult, ImOpenResult } from '../libs/slack-api'
import { SlackUserAuthenticatedEventData } from '../api/slack-oauth-webhook'


const authenticated = async function(data: SlackUserAuthenticatedEventData) {
	const authInfo = await (new WebClient()).oauth.access({
		client_id: process.env.SLACK_CLIENT_ID,
		client_secret: process.env.SLACK_CLIENT_SECRET,
		redirect_uri: process.env.SLACK_OAUTH_REDIRECT_URI,
		code: data.code
	}) as OauthAccessResult;

	const client = new WebClient(authInfo.bot.bot_access_token)
	const teamInfo = await client.team.info() as TeamInfoResult
	const userInfo = await client.users.info({user: authInfo.user_id}) as UsersInfoResult

	let team = await Team.findOne({where: { slackId: teamInfo.team.id }})
	if (!team) {
		team = Team.create({
			slackId: teamInfo.team.id,
			slackBotAccessToken: authInfo.bot.bot_access_token
		})

		await team.save()
		await team.reload()
		emmit('team.created', team)
	}

	let user = await User.findOne({where: { slackId: userInfo.user.id}})
	if (!user) {
		const imInfo = await client.im.open({user: userInfo.user.id}) as ImOpenResult
		assert(imInfo.ok, 'Im open failed!')

		user = User.create({
			slackId: userInfo.user.id,
			name: userInfo.user.real_name,
			team: team,
			slackImChannelId: imInfo.channel.id
		})

		await user.save()
		await user.reload()
		emmit('user.created', user)
	}
}
authenticated.eventType = 'slack.user.authenticated'


module.exports = [authenticated]
