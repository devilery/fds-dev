
import { Commit, CommitCheck, PullRequest, User, Team } from '../entity';
import { ICommitCheck, IPullRequestEvent } from '../events/types';
import { ChatPostMessageResult } from '../libs/slack-api'

import { getPrOpenedMessage } from '../libs/slack-messages'
import { createOrUpdatePr, isHeadCommitCheck } from '../libs/pr';
const { jobDetails } = require('../libs/circleci');
const { sleep } = require('../libs/util');
var Base64 = require('js-base64').Base64;

const opened = async function (data: IPullRequestEvent) {
	const pr = await createOrUpdatePr(data)
	const client = pr.user.team.getSlackClient()

	const messageData = getPrOpenedMessage(data)

	const res = await client.chat.postMessage({text: messageData.text, blocks: messageData.blocks, channel: pr.user.slackImChannelId}) as ChatPostMessageResult
	pr.slackThreadId = res.message.ts
	await pr.save()
};

opened.eventType = 'pr.opened';

const commitCheckUpdate = async function (check: ICommitCheck) {
	const commit = await Commit.findOneOrFail({ where: { sha: check.commit_sha }, relations: ['checks'] })
	const checks = commit.checks
	const pr = await PullRequest.findOneOrFail({ where: { id: check.pull_request_id }, relations: ['user', 'user.team'] })
	const user = pr.user
	const team = user.team

	if (check.context && check.context.includes('ci/circleci')) {
		let ci_data = {};

		if (team.circlePersonalToken) {
			let circleCiData = await jobDetails({ jobUrl: check.target_url, token: team.circlePersonalToken })
			ci_data = {
				estimate_ms: circleCiData.estimate_ms,
				jobs_on_hold: circleCiData.workflow.jobs_on_hold
			}
		}

		Object.assign(check, {
			type: 'ci-circleci',
			ci_data: ci_data
		})
	}

	let dbCheck = await CommitCheck.findOne({ where: { name: check.name } })

	// if changed to done then wait 5 seconds. This way other pending events can activate and entire check flow will not return done
	if (dbCheck && dbCheck.status === 'pending' && check.status === 'success') {
		await sleep(7000) // wait 7 seconds for other events to start if exists
	}


	if (dbCheck && dbCheck.status === check.status) {
		return;
	}

	if (!dbCheck) {
		dbCheck = new CommitCheck()
	}

	dbCheck.githubId = check.id;
	dbCheck.name = check.name;
	dbCheck.status = check.status;
	dbCheck.targetUrl = check.target_url;
	dbCheck.type = check.type as any;
	dbCheck.rawData = check

	await dbCheck.save()

	let isHeadCommit = await isHeadCommitCheck(check.commit_sha, check.pull_request_id)

	if (!isHeadCommit) {
		return
	}

	const client = pr.user.team.getSlackClient()
	const messageData = getPrOpenedMessage(pr, checks)
	await client.chat.update({text: messageData.text, blocks: messageData.blocks, channel: pr.user.slackImChannelId, ts: pr.slackThreadId})

	let allChecksPassed = checks.every(check => check.status === 'success')

	var checkMessgae: IMessageData | null  = null
	if (allChecksPassed)
		checkMessgae = getChecksSuccessMessage(checks)
	if (check.status === 'failure' || check.status === 'error')
		checkMessgae = getCheckErrorMessage(check)

	if (checkMessgae)
		client.chat.postMessage({text: checkMessgae.text, blocks: checkMessgae.blocks, channel: pr.user.slackImChannelId, ts: pr.slackThreadId})

}
commitCheckUpdate.eventType = 'pr.check.update'
