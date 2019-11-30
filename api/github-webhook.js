const firebase = require('../libs/firebase')
const { processGithubPullRequest } = require('../libs/github')


module.exports = async (req, res) => {
  require('../subscribers/subscribe-events.js')();
  
  const { body } = req
  const eventName = req.headers['x-github-event']
  
  switch (eventName) {
    case 'pull_request':
      processGithubPullRequest(body)
      break;
    default:
      console.log('untracked event')
      break;
  }
  res.status(200).end()
}

