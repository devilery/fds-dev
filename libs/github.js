const { emmit } = require('./event')


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
    user_id: userId
  }


  switch (action) {
    case 'open':
      emmit('pr.open', pullRequestData)
      break;
    case 'closed':
      break;
    case 'reopened':
      break;
    default:
      break;
  }
}

function findUserIdByGithubId(githubEventUser) {
  return 'RANDOM_ID' + Math.random().toString()
}

module.exports = {
  processGithubPullRequest
}
