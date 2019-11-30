function processGithubPullRequest(pullRequestEvent) {
  const action = pullRequestEvent.action
  const sender = pullRequestEvent.sender
  const repo = pullRequestEvent.repository

  const user_id = findUserIdByGithubId(sender)

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
