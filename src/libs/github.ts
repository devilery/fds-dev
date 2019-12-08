// import { strict as assert } from 'assert'
const { emmit } = require('./event');
import { getPullRequestsForCommit, getCommitStatus, getCommitInfo } from './github-api';
import { createOrUpdatePr } from './pr';
import { Commit, Repository, GithubOwner, PullRequest, GithubUser } from '../entity'

async function processGithubPullRequest(pullRequestEvent: Webhooks.WebhookPayloadPullRequest) {
  const { action } = pullRequestEvent;
  const { user } = pullRequestEvent.pull_request;

  const userId = await findUserIdByGithubId(user)
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

async function getOwnerByRepositoryId(repoId: number) {
  const repo = await Repository.findOneOrFail({where: {id: repoId.toString()}})
  const owner = await GithubOwner.findOneOrFail({where: {id: repo.id}})
  return owner;
}

async function processCommitStatus(statusEvent: Webhooks.WebhookPayloadStatus) {

  const { repository } = statusEvent;

  // const repo = await Repository.findOneOrFail({where: {id: repository.id.toString()}})
  // assert(repo, `Could not find repo id ${repository.id.toString()}`)

  const owner = await getOwnerByRepositoryId(repository.id);

  const commitPullRequests = await getPullRequestsForCommit(repository.owner.login, repository.name, statusEvent.sha, owner.githubAccessToken);
  const pullRequests = await findAndUpdatePRsById(commitPullRequests)
  await createOrUpdateCommit(statusEvent.commit, pullRequests)

  for (let pull of pullRequests) {
    const statusData = {
      status: normalizeCheckState(statusEvent.state),
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

async function processCheckRun(checkRunEvent: Webhooks.WebhookPayloadCheckRun) {
  const checkStatus = normalizeCheckState(checkRunEvent.check_run.status)

  const { repository } = checkRunEvent;

  const owner = await getOwnerByRepositoryId(repository.id);

  const checkRun = checkRunEvent.check_run

  const commitPullRequests = await getPullRequestsForCommit(repository.owner.login, repository.name, checkRun.head_sha, owner.githubAccessToken);
  const pullRequests = await findAndUpdatePRsById(commitPullRequests)
  const commitInfo = await getCommitInfo(repository.owner.login, repository.name, checkRun.head_sha, owner.githubAccessToken)

  await createOrUpdateCommit(commitInfo, pullRequests)

  for (let pull of pullRequests) {
    const statusData = {
      status: checkStatus,
      type: 'check',
      from: 'github',
      id: checkRun.id,
      commit_sha: checkRun.head_sha,
      name: checkRun.name,
      target_url: checkRun.details_url,
      context: checkRun.name,
      pull_request_id: pull.id,
      raw_data: checkRun
    }

    emmit('pr.check.update', statusData)
  }
}

async function findUserIdByGithubId(ghUserEvent: Webhooks.WebhookPayloadPullRequestPullRequestUser) {
  const user = await GithubUser.findOneOrFail({where: {id: ghUserEvent.id.toString()}});
  return user.user.id;
}

async function findAndUpdatePRsById(GHPullRequests: Octokit.ReposListPullRequestsAssociatedWithCommitResponse) {
  for (let GHpr of GHPullRequests) {
    const pr = await PullRequest.findOneOrFail({where: {id: GHpr.id.toString()}})

    await createOrUpdatePr(transformPRevent(GHpr, pr.user.id))
  }

  const GHPRIds = GHPullRequests.map(item => item.id)

  const pulls = PullRequest.find({where: {githubId: GHPRIds}});
  return pulls;
}

async function createOrUpdateCommit(commit: Webhooks.WebhookPayloadStatusCommit, pullRequests: PullRequest[] = []) {
  const com = await Commit.findOneOrFail({where: {sha: commit.sha}});
  com.rawData = commit;
  com.websiteUrl = commit.html_url;
  await com.save();


  for (let pull of pullRequests) {
    const c = await Commit.findOneOrFail({where: {sha: commit.sha}})
    pull.commits.push(c)
    await pull.save()
  }


}

const avaibleStates: { [key: string]: string; }  = {
  'pending': 'pending',
  'in_progress': 'pending',
  'success': 'success',
  'completed': 'success',
  'error': 'error',
  'failure': 'failure',
  'neutral': 'error',
  'cancelled': 'error',
  'timed_out': 'error',
  'created': 'pending',
  'queued': 'pending'
}

function normalizeCheckState(status: string) {
  return avaibleStates[status]
}

function transformPRevent(
  pull_request: Webhooks.WebhookPayloadPullRequestPullRequest | Octokit.ReposListPullRequestsAssociatedWithCommitResponseItem,
  userId: number) {
  const data = {
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
  processCommitStatus,
  processCheckRun
}
