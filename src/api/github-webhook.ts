import express from 'express'

import { processGithubPullRequest, processCommitStatus, processCheckRun, processPullRequestReview } from '../libs/github'

const router = express.Router();

router.post('/', async(req, res) => {
  const { body } = req
  const eventName = req.headers['x-github-event']
  // console.log(eventName, body);
  // prolly dont have permissions for that data
  if (!body) throw new Error('GitHub webhook missing payload body');
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
    case 'pull_request_review':
      processPullRequestReview(body)
      break;
    default:
      break;
  }
  res.status(200).end()
});


export default router;
