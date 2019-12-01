const { emmit } = require('./event.js');
const { getPullRequestsForCommit } = require('./github-api');


function processGithubPullRequest(pullRequestEvent) {
  const action = pullRequestEvent.action
  const sender = pullRequestEvent.sender
  const githubPullRequest = pullRequestEvent.pull_request

  const userId = findUserIdByGithubId(sender)
  const pullRequestData = {
    id: githubPullRequest.id,
    from: 'github',
    pr_number: githubPullRequest.number,
    website_url: githubPullRequest.html_url,
    title: githubPullRequest.title,
    user_id: userId,
    repository: {
      id: pullRequestEvent.repository.id,
      name: pullRequestEvent.repository.name,
      owner: {
        id: pullRequestEvent.repository.owner.id,
        login: pullRequestEvent.repository.owner.login
      },
      raw_data: pullRequestEvent.repository
    },
    raw_data: pullRequestEvent
  }

  switch (action) {
    case 'opened':
      emmit('pr.opened', pullRequestData)
      break;
    case 'closed':
      break;
    case 'reopened':
      break;
    default:
      break;
  }
}

function processCommitStatus(statusEvent) {
  const githubCommitStatus = statusEvent.status

  let commitPullRequests = await getPullRequestsForCommit(githubCommitStatus.repository.owner.login, githubCommitStatus.repository.name, githubCommitStatus.sha);
  let pullRequests = await findPullRequestsById(commitPullRequests.map((item) => item.id))

  for (let pull of pullRequests) {

    let StatusData = {
      status: githubCommitStatus.status,
      from: 'github',
      id: githubCommitStatus.id,
      commit_sha: githubCommitStatus.sha,
      name: githubCommitStatus.name,
      target_url: githubCommitStatus.target_url,
      context: githubCommitStatus.context,
      description: githubCommitStatus.description,
      pull_request_id: pull.id,
      raw_data: statusEvent
    }

    emmit('pr.commit-status-update', StatusData)
  }
}

async function findUserIdByGithubId(githubEventUser) {
  return 'RANDOM_ID' + Math.random().toString()
}

async function findPullRequestsById(ids) {
  let snapshot = await firebase.database().collection('pull_requests').where('id', 'in', ids).get()
  pullsArray = []
  snapshot.forEach(doc => {
    pullsArray.push(doc.data())
  });

  return pullsArray
}

async function createCommit(commit) {
  await firebase.database().collection('commits')
}

module.exports = {
  processGithubPullRequest,
  processCommitStatus
}
