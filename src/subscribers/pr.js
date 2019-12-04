const { firestore } = require('../libs/firebase')
const { sendPrOpenedMessage, updateMainMessage, sendCheckSuccess, sendCheckError, updatePrOpenedMessage } = require('../libs/slack-messages');
const { createOrUpdatePr, isHeadCommitCheck } = require('../libs/pr');
const { jobDetails } = require('../libs/circleci');

const opened = async function(data) {
	const pr = await createOrUpdatePr(data)
	threadId = await sendPrOpenedMessage(data, 'CR4LW3GRW', 'xoxb-7093049764-856934218934-rXcTgJrUyxbi8kYYOQLI4Eo3')
	pr.update({ slackThreadId: threadId })
};

const commitCheckUpdate = async function (check) {
	let commitRef = await firestore.collection('commits').doc(check.commit_sha)
	let pr = await firestore.collection('pull_requests').doc(check.pull_request_id.toString()).get()
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

	updatePrOpenedMessage(update_msg_data, 'CR4LW3GRW', pr.slackThreadId, 'xoxb-7093049764-856934218934-rXcTgJrUyxbi8kYYOQLI4Eo3')

	if (check.status === 'success') {
		sendCheckSuccess(check, 'CR4LW3GRW', 'xoxb-7093049764-856934218934-rXcTgJrUyxbi8kYYOQLI4Eo3', pr.slackThreadId)
	} else if (check.status === 'failure' || check.status === 'error') {
		sendCheckError(check, 'CR4LW3GRW', 'xoxb-7093049764-856934218934-rXcTgJrUyxbi8kYYOQLI4Eo3', pr.slackThreadId)
	}
}

opened.eventType = 'pr.opened';
commitCheckUpdate.eventType = 'pr.check.update'

module.exports = [opened, commitCheckUpdate];
