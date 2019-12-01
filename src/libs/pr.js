const { firestore } = require('../libs/firebase');

async function createOrUpdatePr(pullRequest) {
  await firestore.collection('pull_requests').doc(data.id.toString()).set(data)
}