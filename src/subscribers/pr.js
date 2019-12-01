const { firestore } = require('../libs/firebase')
const { sendPrOpenedMessage } = require('../libs/slack-messages');
const { createOrUpdatePr, isHeadCommitCheck } = require('../libs/pr');
const { jobDetails } = require('../libs/circleci');

const opened = async function(data) {
	createOrUpdatePr(data)
	sendPrOpenedMessage(data, 'CR4LW3GRW', 'xoxb-7093049764-856934218934-RYkL6mlxEm5qXbozVHeGrjr0');
};

const commitCheckUpdate = async function (check) {
	let commitRef = firestore.collection('commits').doc(check.commit_sha)

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
}

opened.eventType = 'pr.opened';
commitCheckUpdate.eventType = 'pr.check.update'

module.exports = [opened, commitCheckUpdate];
