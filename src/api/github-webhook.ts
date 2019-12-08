import express from 'express'

import { processGithubPullRequest, processCommitStatus, processCheckRun } from '../libs/github'

const router = express.Router();

router.post('/', async(req, res) => {
  const { body } = req
  const eventName = req.headers['x-github-event']

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


export default router;
