const firebase = require('../libs/firebase')
const { processGithubPullRequest, processCommitStatus } = require('../libs/github')


module.exports = async (req, res) => {  
  const { body } = req
  const eventName = req.headers['x-github-event']
  
  switch (eventName) {
    case 'pull_request':
      await processGithubPullRequest(body)
      break;
    case 'status':
      await processCommitStatus(body)
      break;
    default:
      console.log('untracked event')
      break;
  }
  
  res.status(200).end()
}