const { firestore } = require('../libs/firebase')
const { sendPrOpenedMessage, updateMainMessage, sendCheckSuccess, sendCheckError, updatePrOpenedMessage } = require('../libs/slack-messages');
const { createOrUpdatePr, isHeadCommitCheck } = require('../libs/pr');
const { jobDetails } = require('../libs/circleci');

const opened = async function(data) {
	const pr = await createOrUpdatePr(data)
	const prGet = await pr.get()
	const user = await firestore.collection('users').doc(prGet.data().user_id).get()
	const team = await user.data().team.get()
	threadId = await sendPrOpenedMessage(data, user.data().slack_im_channel_id, team.data().slack_bot_access_token)
	pr.update({ slack_thread_id: threadId })
};
opened.eventType = 'pr.opened';

const commitCheckUpdate = async function (check) {
	let commitRef = await firestore.collection('commits').doc(check.commit_sha)
	let pr = await firestore.collection('pull_requests').doc(check.pull_request_id.toString()).get()
	const user = await firestore.collection('users').doc(pr.data().user_id).get()
	pr = pr.data()

	if (check.context && check.context.includes('ci/circleci')) {
		circleCiData = await jobDetails({jobUrl: check.target_url})

		Object.assign(check, {
			type: 'ci-circleci',
			ci_data: {
				estimate_ms: circleCiData.estimate_ms,
				jobs_on_hold: circleCiData.workflow.jobs_on_hold
			}
		})
	}

	commitRef.collection('checks').doc(check.id.toString()).set(check)
	let isHeadCommit = await isHeadCommitCheck(check.commit_sha, check.pull_request_id)

	if (!isHeadCommit) {
		return
	}

	let checks = []
	let allChecks = await commitRef.collection('checks').get()

	allChecks.forEach((ref) => {
		checks.push(ref.data())
	})

	let update_msg_data = {
		checks,
		pr: pr
	}

	let team = await user.data().team.get()

	updatePrOpenedMessage(update_msg_data, user.data().slack_im_channel_id, pr.slack_thread_id, team.data().slack_bot_access_token)

	if (check.status === 'success') {
		sendCheckSuccess(check, user.data().slack_im_channel_id, pr.slack_thread_id, team.data().slack_bot_access_token)
	} else if (check.status === 'failure' || check.status === 'error') {
		sendCheckError(check, user.data().slack_im_channel_id, pr.slack_thread_id, team.data().slack_bot_access_token)
	}
}
commitCheckUpdate.eventType = 'pr.check.update'

module.exports = [opened, commitCheckUpdate];
