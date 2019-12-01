const { firestore } = require('../libs/firebase')
const { sendPrOpenedMessage } = require('../libs/slack-messages');
const { createOrUpdatePr, isHeadCommitCheck } = require('../libs/pr');

const opened = async function(data) {
	createOrUpdatePr(data)
	sendPrOpenedMessage(data, 'CR4LW3GRW', 'xoxb-7093049764-856934218934-OmjqTvxvV3NTRpyOT4lT5kut');
};

const commitCheckUpdate = async function (status) {
	let commitRef = firestore.collection('commits').doc(status.commit_sha)
	commitRef.collection('checks').doc(status.id.toString()).set(status)
	let isHeadCommit = await isHeadCommitCheck(status.commit_sha, status.pull_request_id)

	if (!isHeadCommit) {
		return
	}

	let checksRef = await commitRef.collection('checks').get()
	let checks = checksRef.data()

	console.log('Update slack....')
}

opened.eventType = 'pr.opened';
commitCheckUpdate.eventType = 'pr.check.update'

module.exports = [opened, commitCheckUpdate];
