import assert from './assert';
import httpContext from 'express-http-context'

import { PullRequest, CommitCheck, Commit } from '../entity'
import { IMessageData, getPrMessage, getChecksSuccessMessage, getCheckErrorMessage } from './slack-messages'
import isFeatureFlagEnabled from './featureFlasg'

export async function updatePrMessage(pr: PullRequest, prCommitChecks: CommitCheck[]) {
	assert(pr.slackThreadId, 'PR is missing slack thread id');

	const user = await pr.relation('user');
	const team = await user.relation('team');

	const messageData = await getPrMessage(pr, prCommitChecks);
	
	const client = team.getSlackClient();
	await client.chat.update({text: messageData.text, blocks: messageData.blocks, channel: user.slackImChannelId, ts: pr.slackThreadId})
}

export async function sendChecksNotification(pr: PullRequest) {
	if (pr.lastCheckShaNotification === pr.headSha) {
		return;
	}

	const user = await pr.relation('user');
	const team = await user.relation('team');

	if (!isFeatureFlagEnabled(user, team, 'ci_checks')) {
		return false;
	}

	const commit = await Commit.findOneOrFail({ where: { sha: pr.headSha } })
	const checks = await commit.relation('checks');
	const allChecksPassed = checks.length > 0 && checks.every(check => ['success', 'waiting_for_manual_action', 'blocked'].includes(check.status))
	const errors = checks.filter(check => ['failure', 'error'].includes(check.status))

	let notification: IMessageData | undefined;

	if (errors.length > 0) {
		notification = getCheckErrorMessage(errors[0]);
	} else if (allChecksPassed) {
		notification = getChecksSuccessMessage(checks);
	}

	if (!notification) {
		return;
	}

	pr.lastCheckShaNotification = pr.headSha;
	await pr.save();
	await attachPrMessageUpdate(pr, notification)
}

async function attachPrMessageUpdate(pr: PullRequest, messageData: IMessageData) {
	const user = await pr.relation('user');
	const team = await user.relation('team');

	if (pr.slackThreadId) {
		const client = team.getSlackClient();
		await client.chat.postMessage({text: messageData.text, blocks: messageData.blocks, channel: user.slackImChannelId, thread_ts: pr.slackThreadId, link_names: true})
	}
}
