//@ts-ignore
import { strict as assert } from 'assert'
import { In } from 'typeorm';
import { WebClient } from '@slack/web-api'
import httpContext from 'express-http-context'

import { emmit } from './event';
import { getPullRequestsForCommit, getCommitStatus, getCommitInfo, requestPullRequestReview } from './github-api';
import { createOrUpdatePr } from './pr';
import { Commit, Repository, PullRequest, GithubUser, User, Team, GithubOwner } from '../entity'
import { sleep } from './util';
import { createUser } from '../libs/users'
import { IPullRequestReviewEvent, IPullRequestReviewRequest, IRequestGithubReviewLogin, IPullRequestReviewRequestRemove } from '../events/types';
import { ReviewStateType } from '../entity/PullRequestReview';


export async function processGithubPullRequest(pullRequestEvent: Webhooks.WebhookPayloadPullRequest) {
  const { action, repository } = pullRequestEvent;
  const { user } = pullRequestEvent.pull_request;

  const owner = await getOwnerByRepositoryId(repository.id)
  const userId = await findUserIdByGithubId(user.id, owner)

  if (!userId) {
    return;
  }

  const pullRequestData = transformPRevent(pullRequestEvent.pull_request, userId)

  switch (action) {
    case 'opened':
      emmit('pr.opened', pullRequestData)
      break;
    case 'closed':
      emmit('pr.closed', pullRequestData)
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
      pull_request_id: pull.id,
      raw_data: checkRun
    }

    emmit('pr.check.update', statusData)
  }
}

export async function processPullRequestReview(reviewEvent: Webhooks.WebhookPayloadPullRequestReview) {

  if (reviewEvent.action !== 'submitted') {
    return;
  }

  const review  = reviewEvent.review;
  const pullRequest = await findPRByGithubId(reviewEvent.pull_request.id);
  const owner = await getOwnerByRepositoryId(reviewEvent.repository.id)
  const reviewUserId = await findUserIdByGithubId(reviewEvent.review.user.id, owner)

  if (!pullRequest) {
    console.log('no pull request ', reviewEvent.pull_request.id)
    return;
  }

  if (!pullRequest.user) {
    console.log('no pr user found')
    return;
  }

  if (reviewUserId === pullRequest.user.id) {
    console.log('review from the user that created an PR. Ignore... ', reviewUserId)
    return;
  }

  let eventData: IPullRequestReviewEvent = {
    remoteId: review.id,
    from: 'github',
    body: review. body,
    pull_request_id: pullRequest.id,
    state: review.state as ReviewStateType,
    website_url: review.html_url,
    user: {
      github_login: reviewEvent.review.user.login,
      github_id: reviewEvent.review.user.id
    },
    raw_data: review
  }

  emmit('pr.reviewed', eventData)
}

// no type for this webhook :/
export async function processPullRequestReviewRequest(requestReviewEvent: any) {
  const assignedGithubUser = await GithubUser.findOne({ where: { githubId: requestReviewEvent.requested_reviewer.id } })
  const team = httpContext.get('team') as Team;
  const assignedUser = await User.findOne({ where: { githubUser: assignedGithubUser, team: team } })
  const pr = await findPRByGithubId(requestReviewEvent.pull_request.id)

  if (pr) {
    let reviewRequest: IPullRequestReviewRequest = {
      pull_request_id: pr.id,
      assignee_user_id: assignedUser ? assignedUser.id : undefined,
      review_username: requestReviewEvent.requested_reviewer.login
    }

    emmit('pr.review.request', reviewRequest)
  }
}

export async function processPullRequestReviewRequestRemove(requestReviewRemoveEvent: any) {
  const assignedGithubUser = await GithubUser.findOne({ where: { githubId: requestReviewRemoveEvent.requested_reviewer.id } })
  const team = httpContext.get('team') as Team;
  const assignedUser = await User.findOne({ where: { githubUser: assignedGithubUser, team: team } })
  const pr = await findPRByGithubId(requestReviewRemoveEvent.pull_request.id)

  if (pr) {
    let reviewRequest: IPullRequestReviewRequestRemove = {
      pull_request_id: pr.id,
      assignee_user_id: assignedUser ? assignedUser.id : undefined,
      review_username: requestReviewRemoveEvent.requested_reviewer.login
    }

    emmit('pr.review.request.remove', reviewRequest)
  }
}

export async function processPullRequestReviewComment(commentEvent: Webhooks.WebhookPayloadPullRequestReviewComment) {
  if (commentEvent.action !== 'created') {
    return;
  }

  const team = httpContext.get('team') as Team;
  const authorGHUser = await GithubUser.findOne({ where: { githubId: commentEvent.comment.user.id } })
  const author = await User.findOne({ where: { githubUser: authorGHUser, team: team } })

  if (author) {
    console.log('no user for this comment')
  }
}

export async function requestSlackUsersToReview(handles: string[], prNumber: number, author: User) {
  assert(handles.length > 0, 'No slack users to request review')
  assert(author, 'No github author passed during review request')

  const team = httpContext.get('team') as Team
  assert(team, 'No team passed during review request')

  handles.forEach(async handle => {
    const user = await User.findOne({ where: { slackId: handle }, relations: ['githubUser']})
    if (user) {
      // send request to github api
      if (user.githubUser) {
        const { githubUser } = user;
        const pr = await PullRequest.findOneOrFail({ where: { prNumber: prNumber }, relations: ['repository', 'repository.owner']})
        const repo = pr.repository;
        await requestPullRequestReview(repo.owner.login, repo.name, prNumber, { reviewers: [githubUser.githubUsername] }, author.githubUser!.githubAccessToken)

        let reviewRequest: IPullRequestReviewRequest = {
          pull_request_id: pr.id,
          assignee_user_id: user.id,
          review_username: githubUser.githubUsername
        }

        emmit('pr.review.request', reviewRequest)
      } else {
        let data: IRequestGithubReviewLogin = {
          user_id: user.id,
          author_user_id: author.id,
          pr_number: prNumber
        }

        emmit('github.user.request.review.create', data)
      }
    } else {
      // create new user without github token and
      // send them oauth message to slack to authenticate
      // to populate the token column
      const newUser = await createUser(handle, team, null, false);

      let data: IRequestGithubReviewLogin = {
        user_id: newUser.id,
        author_user_id: author.id,
        pr_number: prNumber
      }

      emmit('github.user.request.review.create', data)
    }
  })
}

async function getOwnerByRepositoryId(repoId: number) {
  const repo = await Repository.findOneOrFail({ where: { githubId: repoId }, relations: ['owner'] })
  const owner = repo.owner
  return owner;
}

async function findUserIdByGithubId(ghUserId: number, owner: GithubOwner) {
  const team = httpContext.get('team')
  const githubUser = await GithubUser.findOne({where: { githubId: ghUserId }})
  const user = await User.findOne({ where: { githubUser: githubUser, team: team } })
  if (!user) {
    return;
  }

  return user.id
}

async function findPRByGithubId(id: number) {
  return await PullRequest.findOne({ where: { githubId: id }, relations: ['user'] })
}

async function findAndUpdatePRsById(GHPullRequests: Octokit.ReposListPullRequestsAssociatedWithCommitResponse) {
  const prs: PullRequest[] = []
  let run = 0;

  async function searchPrs() {
    if (run === 3) {
      return;
    }

    let existingPulls = await PullRequest.find({ where: { githubId: In([null, ...GHPullRequests.map(item => item.id)]) }, relations: ['user'] })

    if (!!!existingPulls) {
      await sleep(3000)
      run++
      await searchPrs()
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

export async function createOrUpdateCommit(commit: Webhooks.WebhookPayloadStatusCommit | Octokit.ReposGetCommitResponse, pullRequests: PullRequest[] = []) {
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
  return com;
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
  let state = pull_request.state;
  if (pull_request.merged_at) {
    state = 'merged';
  }

  const data = {
    id: pull_request.id,
    from: 'github',
    pr_number: pull_request.number,
    website_url: pull_request.html_url,
    title: pull_request.title,
    head_sha: pull_request.head.sha,
    state: state,
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
