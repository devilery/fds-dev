const firebase = require('../libs/firebase');

async function createOrUpdatePr(pullRequest) {
  await firebase.firestore().collection('pull_requests').doc(data.id.toString()).set(data)
}