function processGithubPullRequest(pullRequestEvent) {
  const action = pullRequestEvent.action
  const sender = pullRequestEvent.sender
  const repo = pullRequestEvent.repository
  const githubPullRequest = pullRequestEvent.pull_request

  const userId = findUserIdByGithubId(sender)
  const pullRequestData = {
    id: githubPullRequest.id,
    from: 'github',
    number: githubPullRequest.number,
    websiteUrl: githubPullRequest.html_url,
    title: githubPullRequest.title
  }


  switch (action) {
    case 'open':
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
