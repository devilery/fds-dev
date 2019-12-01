const { firestore } = require('../libs/firebase');

async function createOrUpdatePr(pullRequest) {
  return firestore.collection('pull_requests').doc(pullRequest.id.toString()).set(pullRequest)
}

async function isHeadCommitCheck(sha, pullRequestId) {
  let ref = await firestore.collection('pull_requests').doc(pullRequestId.toString()).get()
  return ref.data().head_sha === sha
}

module.exports = { createOrUpdatePr, isHeadCommitCheck }