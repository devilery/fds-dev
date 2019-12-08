import { PullRequest } from "../entity";

const { firestore } = require('../libs/firebase');

async function createOrUpdatePr(pullRequest: any) {
  const pr = await firestore.collection('pull_requests').doc(pullRequest.id.toString())

  await pr.set(pullRequest, { merge: true })

  if (pullRequest.user_id) {
    let user = await firestore.collection('users').doc(pullRequest.user_id.toString())
    await pr.update({ user_ref: user })
  }

  return pr
}

async function isHeadCommitCheck(sha: string, pullRequestId: number) {
  const pullRequest = await PullRequest.findOneOrFail({ where: { id: pullRequestId } })
  return pullRequest.headSha === sha
}

module.exports = { createOrUpdatePr, isHeadCommitCheck }