import { ICommitCheck } from "./eventTypes";
import { Commit, CommitCheck, PullRequest, User } from '../entity';

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
	const allChecks = commit.checks
	const pr = await PullRequest.findOneOrFail({ where: { id: check.pull_request_id } })
	const user = pr.user

	let team = user.team

	if (check.context && check.context.includes('ci/circleci')) {
		let ci_data = {};

		// if (team.circle_personal_token) {
		// 	let circleCiData = await jobDetails({ jobUrl: check.target_url, token: team.circle_personal_token })
		// 	ci_data = {
		// 		estimate_ms: circleCiData.estimate_ms,
		// 		jobs_on_hold: circleCiData.workflow.jobs_on_hold
		// 	}
		// }

		Object.assign(check, {
			type: 'ci-circleci',
			ci_data: ci_data
		})
	}

	const dbCheck = await CommitCheck.findOne({ where: { name: check.name } })

	// if changed to done then wait 5 seconds. This way other pending events can activate and entire check flow will not return done
	if (dbCheck && dbCheck.status === 'pending' && check.status === 'success') {
		await sleep(7000) // wait 7 seconds for other events to start if exists
	}


	if (dbCheck && dbCheck.status === check.status) {
		return;
	}

	if (!dbCheck) {}


	let isHeadCommit = await isHeadCommitCheck(check.commit_sha, check.pull_request_id)

	if (!isHeadCommit) {
		return
	}

	let checks = []
	let allChecks = await allChecksRef.get()

	allChecks.forEach((ref) => {
		checks.push(ref.data())
	})

	let update_msg_data = {
		checks,
		pr: pr
	}

	await updatePrOpenedMessage(update_msg_data, user.data().slack_im_channel_id, pr.slack_thread_id, team.data().slack_bot_access_token)

	let allChecksPassed = checks.every(check => check.status === 'success')

	if (allChecksPassed) {
		sendChecksSuccess(checks, user.data().slack_im_channel_id, pr.slack_thread_id, team.data().slack_bot_access_token)
	}

	if (check.status === 'failure' || check.status === 'error') {
		sendCheckError(check, user.data().slack_im_channel_id, pr.slack_thread_id, team.data().slack_bot_access_token)
	}

}
commitCheckUpdate.eventType = 'pr.check.update'

module.exports = [opened, commitCheckUpdate];
