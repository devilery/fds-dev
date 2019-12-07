import { strict as assert } from 'assert';

const router = require('express').Router();
const { emmit } = require('../libs/event.js')

const { retryBuild, jobDetails } = require('../libs/circleci')
const { getPullRequestsForCommit } = require('../libs/github-api')
const { trackEvent } = require('../libs/honeycomb')
const { firestore } = require('../libs/firebase')
import User from '../entity/User'
import Team from '../entity/Team'

function deleteCollection(db, collectionPath, batchSize) {
  let collectionRef = db.collection(collectionPath);
  let query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, batchSize, resolve, reject);
  });
}

function deleteQueryBatch(db, query, batchSize, resolve, reject) {
  query.get()
    .then((snapshot) => {
      // When there are no documents left, we are done
      if (snapshot.size == 0) {
        return 0;
      }

      // Delete documents in a batch
      let batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      return batch.commit().then(() => {
        return snapshot.size;
      });
    }).then((numDeleted) => {
      if (numDeleted === 0) {
        resolve();
        return;
      }

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(db, query, batchSize, resolve, reject);
      });
    })
    .catch(reject);
}

async function testDb() {
  // test data
  const team = new Team();
  team.githubConnected = true;
  team.slackId = 'dfsdf';
  await team.save();

  const [, count1] = await User.findAndCount()

  const user = new User();
  user.team = team;
  user.slackId = 'adfasdfasd';
  user.name = 'name'
  user.slackAuthCode = 'name'
  user.slackImChannel = 'name'
  await user.save();

  // loads db populated columns
  await user.reload()

  console.log(user);


  const u = await User.findOne({where: {id: user.id}})

  const [, count2] = await User.findAndCount()
  console.log(u);

  assert.equal(count2 - count1, 1)

  await u.remove();

  const [, count3] = await User.findAndCount()

  assert.equal(count1, count3)

  // await team.reload()
  await team.remove();
}

router.get('/', async(req, res) => {
	// const { body } = req;
	// emmit(body.type, body);



	const output = [
	// await retryBuild({vcs: 'gh', username:'feature-delivery', project:'fds-dev', build_num: '90'})
	// await jobDetails({jobUrl: 'https://circleci.com/gh/feature-delivery/fds-dev/102'})
	// await getPullRequestsForCommit('feature-delivery', 'fds-dev', 'f0f23031314d2509a5a97fb9b0398c9125b6f636')
	// trackEvent('test_event', {test_prop:true})
    await testDb()
	]

  console.log('TEST', output)

	res.end();
});

router.get('/delete', async(req, res) => {

	deleteCollection(firestore, 'teams', 100)
	deleteCollection(firestore, 'repos', 100)
	deleteCollection(firestore, 'gh_users', 100)
	deleteCollection(firestore, 'checks', 100)
	deleteCollection(firestore, 'commits', 100)
	deleteCollection(firestore, 'github_owners', 100)
	deleteCollection(firestore, 'pull_requests', 100)
	deleteCollection(firestore, 'users', 100)

	res.end()

});

module.exports = router;
