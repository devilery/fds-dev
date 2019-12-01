const { emmit } = require('./event');
const { firestore } = require('./firebase')
const { getPullRequestsForCommit } = require('./github-api');
const { createOrUpdatePr } = require('./pr');


async function processGithubPullRequest(pullRequestEvent) {
  const action = pullRequestEvent.action
  const userGH = pullRequestEvent.pull_request.user

  const userId = await findUserIdByGithubId(userGH)
  const pullRequestData = transformPRevent(pullRequestEvent.pull_request, userId)

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

  let repoRef = firestore.collection('repos').doc(statusEvent.repository.id.toString()).get()
  let ownerRef = repoRef.owner_ref.get()

  let commitPullRequests = await getPullRequestsForCommit(statusEvent.repository.owner.login, statusEvent.repository.name, statusEvent.sha, ownerRef.github_access_token);
  let pullRequests = await findAndUpdatePRsById(commitPullRequests)
  await createOrUpdateCommit(statusEvent.commit, pullRequests)

  for (let pull of pullRequests) {
    let statusData = {
      status: statusEvent.state,
      type: 'standard',
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

    emmit('pr.check.update', statusData)
  }
}

async function findUserIdByGithubId(ghUserEvent) {
  let ghUser = await firebase.collection('gh_user').doc(ghUserEvent.id.toString()).get()
  let user = ghUser.data().user_ref
  return user.data().id
}

async function findAndUpdatePRsById(GHPullRequests) {
  for (let GHpr of GHPullRequests) {
    let pr = await firestore.collection('pull_requests').doc(GHpr.id.toString()).get()
    if (pr.exists) {
      await createOrUpdatePr(transformPRevent(GHpr))
    }
  }

  let snapshot = await firestore.collection('pull_requests').where('id', 'in', GHPullRequests.map(item => item.id)).get()

  pullsArray = []
  snapshot.forEach(doc => {
    pullsArray.push(doc.data())
  });

  return pullsArray
}

async function createOrUpdateCommit(commit, pullRequests = []) {
  let commitRef = await firestore.collection('commits').doc(commit.sha)
  commitRef.set(commit, { merge: true })

  for (let pull of pullRequests) {
    await firestore.collection('pull_requests').doc(pull.id.toString()).collection('commits').doc(commit.sha).set({
      commit_ref: commitRef
    })
  }
}

function transformPRevent(pull_request, userId) {
  let data = {
    id: pull_request.id,
    from: 'github',
    pr_number: pull_request.number,
    website_url: pull_request.html_url,
    title: pull_request.title,
    head_sha: pull_request.head.sha,
    repository: {
      id: pull_request.head.repo.id,
      name: pull_request.head.repo.name,
      owner: {
        id: pull_request.head.repo.owner.id,
        login: pull_request.head.repo.owner.login
      },
      raw_data: pull_request.head.repo
    },
    raw_data: pull_request
  }

  if (userId) {
    Object.assign(data, { user_id: userId })
  }

  return data
}


module.exports = {
  processGithubPullRequest,
  processCommitStatus
}
