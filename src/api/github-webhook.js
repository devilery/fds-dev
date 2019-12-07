const router = require('express').Router();
const firebase = require('../libs/firebase')
const { processGithubPullRequest, processCommitStatus, processCheckRun } = require('../libs/github')


router.post('/', async(req, res) => {
  const { body } = req
  const eventName = req.headers['x-github-event']
  
  console.log('event name: ', eventName)
  switch (eventName) {
    case 'pull_request':
      processGithubPullRequest(body)
      break;
    case 'status':
      await processCommitStatus(body)
      break;
    case 'check_run':
      processCheckRun(body)
      break;
    default:
      break;
  }
  res.status(200).end()
});


module.exports = router;