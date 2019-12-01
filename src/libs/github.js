const { emmit } = require('./event');
const firebase = require('./firebase')
const { getPullRequestsForCommit } = require('./github-api');
const { createOrUpdatePr } = require('./pr');


async function processGithubPullRequest(pullRequestEvent) {
  const action = pullRequestEvent.action
  const sender = pullRequestEvent.sender
  

  const userId = await findUserIdByGithubId(sender)
  const pullRequestData = transformPRevent(pullRequestEvent)

  switch (action) {
    case 'opened':
      emmit('pr.opened', pullRequestData)
      break;
    case 'closed':
      break;
    case 'reopened':
      emmit('pr.opened', pullRequestData)
      break;
    default:
      break;
  }
}

async function processCommitStatus(statusEvent) {
  const githubCommitStatus = statusEvent.status

  let commitPullRequests = await getPullRequestsForCommit(statusEvent.repository.owner.login, statusEvent.repository.name, statusEvent.sha);
  let pullRequests = await findAndUpdatePRsById(commitPullRequests)
  await createCommit(statusEvent.commit)

  for (let pull of pullRequests) {

    let gitPullRaw = commitPullRequests.find(item => item.id === pull.id)
    let isHeadCommit = gitPullRaw.head.sha === statusEvent.sha

    console.log(isHeadCommit)
    if (!isHeadCommit) {
      return
    }

    let statusData = {
      status: statusEvent.status,
      from: 'github',
      id: statusEvent.id,
      commit_sha: statusEvent.sha,
      name: statusEvent.name,
      target_url: statusEvent.target_url,
      context: statusEvent.context,
      description: statusEvent.description,
      pull_request_id: pull.id,
      raw_data: statusEvent
    }

    emmit('pr.head-commit-status-update', statusData)
    console.log('EMIT STATUS')
  }
}

async function findUserIdByGithubId(githubEventUser) {
  return 'RANDOM_ID' + Math.random().toString()
}

async function findAndUpdatePRsById(GHPullRequests) {
  for (let GHpr of GHPullRequests) {
    let exists = await firebase.firestore().collection('pull_requests').doc(GHpr.id).get().exists
    if (exists) {
      await createOrUpdatePr(transformPRevent(GHpr))
    }
  }

  let snapshot = await firebase.firestore().collection('pull_requests').where('id', 'in', GHPullRequests.map(item => item.id)).get()

  pullsArray = []
  snapshot.forEach(doc => {
    pullsArray.push(doc.data())
  });

  return pullsArray
}

async function createCommit(commit) {
  await firebase.firestore().collection('commits').doc(commit.sha).set(commit)
}

function transformPRevent(githubPullRequest) {
  const pull = pullRequestEvent.pull_request
  return {
    id: pull.id,
    from: 'github',
    pr_number: pull.number,
    website_url: pull.html_url,
    title: pull.title,
    user_id: userId,
    head_sha: pullRequestEvent.head.sha,
    repository: {
      id: githubPullRequest.repository.id,
      name: githubPullRequest.repository.name,
      owner: {
        id: githubPullRequest.repository.owner.id,
        login: githubPullRequest.repository.owner.login
      },
      raw_data: githubPullRequest.repository
    },
    raw_data: githubPullRequest
  }
}

module.exports = {
  processGithubPullRequest,
  processCommitStatus
}
