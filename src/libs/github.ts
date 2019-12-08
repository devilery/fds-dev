//@ts-ignore
import { strict as assert } from 'assert'
import { In } from 'typeorm';
import { WebClient } from '@slack/web-api'

import { emmit } from './event';
import { getPullRequestsForCommit, getCommitStatus, getCommitInfo, requestPullRequestReview } from './github-api';
import { createOrUpdatePr } from './pr';
import { Commit, Repository, PullRequest, GithubUser, User, Team } from '../entity'
import { sleep } from './util';
import { createUser } from '../libs/users'


export async function processGithubPullRequest(pullRequestEvent: Webhooks.WebhookPayloadPullRequest) {
  const { action } = pullRequestEvent;
  const { user } = pullRequestEvent.pull_request;

  const userId = await findUserIdByGithubId(user)
  if (!userId) {
    return;
  }

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

export async function processCommitStatus(statusEvent: Webhooks.WebhookPayloadStatus) {
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
      name: statusEvent.context,
      target_url: statusEvent.target_url,
      context: statusEvent.context,
      description: statusEvent.description,
      pull_request_id: pull.id,
      raw_data: statusEvent
    }

    emmit('pr.check.update', statusData)
  }
}

export async function processCheckRun(checkRunEvent: Webhooks.WebhookPayloadCheckRun) {
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

export async function requestSlackUsersToReview(handles: string[], prNumber: number, githubAuthor: GithubUser, team: Team) {
  assert(handles.length > 0, 'No slack users to request review')
  assert(githubAuthor, 'No github author passed during review request')
  assert(team, 'No team passed during review request')

  handles.forEach(async handle => {
    const user = await User.findOne({where: {slackId: In(handles)}, relations: ['githubUser']})
    console.log(user);
    if (user) {
      // send request to github api
      if (user.githubUser) {
        const { githubUser } = user;
        // TODO: get dynamically
        const repo = await Repository.findOneOrFail();
        console.log('repo', repo);

        requestPullRequestReview(repo.rawData.owner.login, repo.rawData.name, prNumber, {reviewers:[githubUser.githubUsername]}, githubAuthor.githubAccessToken)
      } else {
        // TODO: send github login flow message
      }
    } else {
      // create new user without github token and
      // send them oauth message to slack to authenticate
      // to populate the token column
      // TODO: udpate the oauth flow finish to do request assign

      // TODO: get dynamically
      await createUser(handle, team, {reviewPR: prNumber, prAuthor: githubAuthor.id})
    }
  })
}

async function getOwnerByRepositoryId(repoId: number) {
  const repo = await Repository.findOneOrFail({ where: { githubId: repoId }, relations: ['owner'] })
  const owner = repo.owner
  return owner;
}

async function findUserIdByGithubId(ghUserEvent: Webhooks.WebhookPayloadPullRequestPullRequestUser) {
  const user = await GithubUser.findOne({where: {githubId: ghUserEvent.id }, relations: ['user']});
  if (!user) {
    return;
  }

  return user.user.id;
}

async function findAndUpdatePRsById(GHPullRequests: Octokit.ReposListPullRequestsAssociatedWithCommitResponse) {
  const prs: PullRequest[] = []

  async function searchPrs(run = 0) {
    let existingPulls = await PullRequest.find({ where: { githubId: In([null, ...GHPullRequests.map(item => item.id)]) }, relations: ['user'] })

    if (run >= 3) {
      return;
    }


    if (existingPulls.length === 0) {
      await sleep(3000)
      await searchPrs(run++)
      return;
    }

    for (const pull of existingPulls) {
      const GHpr = GHPullRequests.find(item => item.id === pull.githubId)!
      await createOrUpdatePr(transformPRevent(GHpr, pull.user.id))
      await pull.reload()
      prs.push(pull)
    }
  }

  await searchPrs();
  return prs;
}

async function createOrUpdateCommit(commit: Webhooks.WebhookPayloadStatusCommit | Octokit.ReposGetCommitResponse, pullRequests: PullRequest[] = []) {
  let com = await Commit.findOne({where: {sha: commit.sha}, relations: ['pullRequests']});

  if (!com) {
    com = new Commit()
    com.pullRequests = []
  }

  com.rawData = commit;
  com.websiteUrl = commit.html_url;
  com.sha = commit.sha

  await com.save();
  for (let pull of pullRequests) {
    let exists = com.pullRequests.find(item => item.id === pull.id);
    if (!exists) {
      com.pullRequests.push(pull)
    }
  }
  await com.save()
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

function transformPRevent(pull_request: Webhooks.WebhookPayloadPullRequestPullRequest | Octokit.ReposListPullRequestsAssociatedWithCommitResponseItem, userId: number) {
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
