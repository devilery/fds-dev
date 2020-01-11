// @ts-nocheck
import assert from '../libs/assert';

const router = require('express').Router();
const { emmit } = require('../libs/event.js')

import { retryBuild, jobDetails } from '../libs/circleci-api'
import { getPullRequestsForCommit, requestPullRequestReview, removePullRequestReview, mergePR } from '../libs/github-api'
const { trackEvent } = require('../libs/honeycomb')
import { User, Team, GithubUser, CommitCheck } from '../entity';
import { requestSlackUsersToReview } from '../libs/github'


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

  const gu2 = await GithubUser.findOneOrFail({ where: { id: ghUser.id }});
  console.log(gu2.users);

  await gu2.relation('users')
  console.log(gu2.users)


  // await team.reload()
  await team.remove();
}

async function testRelation() {
  const team = new Team();
  team.githubConnected = true;
  team.slackId = 'dfsdf';
  team.slackBotAccessToken = 'adsasasd'
  await team.save();

  const user2 = new User();
  user2.team = team;
  user2.slackId = 'adfasdfasd';
  user2.name = 'name'
  user2.slackImChannelId = 'name'
  await user2.save();
  await user2.reload();

  const ghUser = GithubUser.create({ githubId: 1, githubUsername: 'neco', githubAccessToken: 'asdasdasdasasdasd', rawGithubUserData: {} })
  await ghUser.save();
  await ghUser.reload();

  user2.githubUser = ghUser;
  await user2.save()
  await user2.reload()

  const gu2 = await GithubUser.findOneOrFail(ghUser.id);
  console.log(gu2.users);

  const ahoj = await gu2.relation('users')
  console.log(ahoj)
}

router.get('/', async(req, res, next) => {
	// const { body } = req;
	// emmit(body.type, body);

  if (process.env.NODE_ENV !== 'development') return next();

	const output = [
    // await retryBuild({vcs: 'gh', username:'feature-delivery', project:'fds-dev', build_num: '90'})
    // await jobDetails({jobUrl: 'https://circleci.com/gh/feature-delivery/fds-dev/102'})
    // await getPullRequestsForCommit('feature-delivery', 'fds-dev', 'token')
    // trackEvent('test_event', {test_prop:true})
    // await testDb(),
    // await testRelation(),
    // await requestPullRequestReview('devilery', 'fds-dev', 51, {reviewers:['LeZuse']}, 'xx')
    // await removePullRequestReview('devilery', 'fds-dev', 51, {reviewers:['LeZuse']}, 'xx')
    // U079RBVST marek, T072R1FNG 9roads
    // await requestSlackUsersToReview(['U079RBVST'], 51, await Team.findOneOrFail({where: {slackId: 'T072R1FNG'}}))
    // await mergePR('devilery', 'fds-dev', 57, 'token')
    // await GithubUser.findOrCreate({githubId: 1}, {githubUsername: 'fake', githubAccessToken: 'faketoken', rawGithubUserData: {}})
    // await CommitCheck.updateOrCreate({name: 'test', type: 'test'}, {status: 'updated status 11111'}), // create
    // await CommitCheck.updateOrCreate({name: 'test', type: 'test'}, {status: 'updated status XXXX'}) // and update
	]

  console.log('TEST', output)

	res.end();
});

module.exports = router;
