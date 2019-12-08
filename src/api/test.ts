// @ts-nocheck
import { strict as assert } from 'assert';

const router = require('express').Router();
const { emmit } = require('../libs/event.js')

const { retryBuild, jobDetails } = require('../libs/circleci')
const { getPullRequestsForCommit } = require('../libs/github-api')
const { trackEvent } = require('../libs/honeycomb')
import { User, Team, GithubUser } from '../entity';


async function testDb() {
  // test data
  const team = new Team();
  team.githubConnected = true;
  team.slackId = 'dfsdf';
  team.slackBotAccessToken = 'adsasasd'
  await team.save();

  const [, count1] = await User.findAndCount()

  const user = new User();
  user.team = team;
  user.slackId = 'adfasdfasd';
  user.name = 'name'
  user.slackImChannelId = 'name'
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


  const user2 = new User();
  user2.team = team;
  user2.slackId = 'adfasdfasd';
  user2.name = 'name'
  user2.slackImChannelId = 'name'
  await user2.save();
  await user2.reload();

  const ghUser = GithubUser.create({githubId: 1, githubUsername: 'neco', githubAccessToken: 'asdasdasdasasdasd', rawGithubUserData: {}, user: user2})
  await ghUser.save();
  await ghUser.reload();

  const u2 = await User.findOne(user2.id, {relations: ['githubUser']})
  const gu = await GithubUser.findOne({where: {id: ghUser.id}, relations: ['user']})

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

module.exports = router;
