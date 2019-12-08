
import { Commit, CommitCheck, PullRequest, User } from '../entity';
import { ICommitCheck } from '../events/types';

const { firestore } = require('../libs/firebase')
const { sendPrOpenedMessage, sendCiBuildSuccess, sendCheckError, updatePrOpenedMessage, sendChecksSuccess } = require('../libs/slack-messages');
const { createOrUpdatePr, isHeadCommitCheck } = require('../libs/pr');
const { jobDetails } = require('../libs/circleci');
const { sleep } = require('../libs/util');
var Base64 = require('js-base64').Base64;

const opened = async function(data) {
	const pr = await createOrUpdatePr(data)
	const prGet = await pr.get()
	const user = await firestore.collection('users').doc(prGet.data().user_id).get()
	const team = await user.data().team.get()
	threadId = await sendPrOpenedMessage(data, user.data().slack_im_channel_id, team.data().slack_bot_access_token)
	pr.update({ slack_thread_id: threadId })
};
opened.eventType = 'pr.opened';

const commitCheckUpdate = async function (check: ICommitCheck) {
	const commit = await Commit.findOneOrFail({ where: { sha: check.commit_sha } })
	const checks = commit.checks
	const pr = await PullRequest.findOneOrFail({ where: { id: check.pull_request_id } })
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

	let update_msg_data = {
		checks,
		pr: pr
	}

	await updatePrOpenedMessage(update_msg_data, user.slackImChannelId, pr.slackThreadId, team.slackBotAccessToken)

	let allChecksPassed = checks.every(check => check.status === 'success')

	if (allChecksPassed) {
		sendChecksSuccess(checks, user.slackImChannelId, pr.slackThreadId, team.slackBotAccessToken)
	}

	if (check.status === 'failure' || check.status === 'error') {
		sendCheckError(check, user.slackImChannelId, pr.slackThreadId, team.slackBotAccessToken)
	}

}
commitCheckUpdate.eventType = 'pr.check.update'

module.exports = [opened, commitCheckUpdate];
