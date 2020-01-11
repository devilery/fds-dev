import assert from './assert';
import httpContext from 'express-http-context'

import { PullRequest, CommitCheck, Team, User } from '../entity'
import { IMessageData, getPrMessage, getChecksSuccessMessage, getCheckErrorMessage } from './slack-messages'

export async function updatePrMessage(pr: PullRequest, prCommitChecks: CommitCheck[]) {
	assert(pr.slackThreadId, 'PR is missing slack thread id')
	// const client = pr.user.team.getSlackClient()
	const team = httpContext.get('team');
	const client = team.getSlackClient()
	const messageData = await getPrMessage(pr, prCommitChecks)

	await client.chat.update({text: messageData.text, blocks: messageData.blocks, channel: pr.user.slackImChannelId, ts: pr.slackThreadId})
}

export async function sendPipelineNotifiation(pr: PullRequest, prCommitChecks: CommitCheck[], check: CommitCheck) {
	const user = httpContext.get('team') as User;
	const team = httpContext.get('team') as Team;

	if (team && team.featureFlags && !team.featureFlags.ci_checks) return;
	if (user && user.featureFlags && !user.featureFlags.ci_checks) return;

	const allChecksPassed = prCommitChecks.every(check => check.status === 'success')

	const notificationMessage = allChecksPassed
		? getChecksSuccessMessage(prCommitChecks)
		: ['failure', 'error'].includes(check.status)
			? getCheckErrorMessage(check)
			: null;

	if (!notificationMessage) {
		return;
	}

	await attachPrMessageUpdate(pr, notificationMessage)
}

async function attachPrMessageUpdate(pr: PullRequest, messageData: {text?: string, blocks?: Array<{}>}) {
	const team = httpContext.get('team');
	const client = team.getSlackClient();

	await client.chat.postMessage({...messageData, channel: pr.user.slackImChannelId, thread_ts: pr.slackThreadId, link_names: true})
}
