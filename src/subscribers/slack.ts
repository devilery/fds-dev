// @ts-ignore
import { strict as assert } from 'assert';
import { WebClient } from '@slack/web-api'

import { emmit } from '../libs/event.js'
import { Team, User, PullRequest } from '../entity'
import { OauthAccessResult, UsersInfoResult, TeamInfoResult, ImOpenResult } from '../libs/slack-api'
import { ISlackUserAuthenticatedEvent } from '../api/slack-oauth-webhook'
import { createUser } from '../libs/users'
import { mergePR } from '../libs/github-api'


const authenticated = async function(data: ISlackUserAuthenticatedEvent) {
	const authInfo = await (new WebClient()).oauth.access({
		client_id: process.env.SLACK_CLIENT_ID,
		client_secret: process.env.SLACK_CLIENT_SECRET,
		redirect_uri: process.env.SLACK_OAUTH_REDIRECT_URI,
		code: data.code
	}) as OauthAccessResult;

	const client = new WebClient(authInfo.bot.bot_access_token)
	const teamInfo = await client.team.info() as TeamInfoResult

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

	let user = await User.findOne({where: { slackId: authInfo.user_id}})
	if (!user) {
		await createUser(authInfo.user_id, team)
	}
}
authenticated.eventType = 'slack.user.authenticated'

const actionMerge = async function(data: {pr: number, team: Team}) {
	console.log('event action Merge', data);
	console.log('Merge PR number', data['pr']);
	const pr = await PullRequest.findOneOrFail(data.pr, { relations:['user', 'user.githubUser'] });
	// const user = await User.findOneOrFail(pr.user.id, {relations:['githubUser']});
	console.log(pr.user.githubUser);
	assert(pr.user.githubUser, 'Github User for PR not found')
	mergePR(pr.rawData.repository.owner.login, pr.rawData.repository.name, pr.prNumber, pr.user.githubUser.githubAccessToken)
}
actionMerge.eventType = 'slack.action.merge'

module.exports = [authenticated, actionMerge]
