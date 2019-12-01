const { firestore } = require('../libs/firebase');

async function createOrUpdatePr(pullRequest) {
  const pr = await firestore.collection('pull_requests').doc(pullRequest.id.toString())
  await pr.set(pullRequest, { merge: true })
  return pr
}

async function isHeadCommitCheck(sha, pullRequestId) {
  let ref = await firestore.collection('pull_requests').doc(pullRequestId.toString()).get()
  return ref.data().head_sha === sha
}

module.exports = { createOrUpdatePr, isHeadCommitCheck }