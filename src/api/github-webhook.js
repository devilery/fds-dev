const router = require('express').Router();
const firebase = require('../libs/firebase')
const { processGithubPullRequest, processCommitStatus } = require('../libs/github')


router.post('/', async(req, res) => {
  const { body } = req
  const eventName = req.headers['x-github-event']
  
  switch (eventName) {
    case 'pull_request':
      processGithubPullRequest(body)
      break;
    case 'status':
      processCommitStatus(body)
      break;
    default:
      console.log('untracked event')
      break;
  }
  res.status(200).end()
});


module.exports = router;