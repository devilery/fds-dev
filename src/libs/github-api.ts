//@ts-ignore
import { strict as assert } from 'assert'
import axios from 'axios';
import jwt from 'jsonwebtoken';
import createAuthRefreshInterceptor from 'axios-auth-refresh';
import { GithubOwner } from '../entity'
const GITHUB_API_URL = 'https://api.github.com'

const session = axios.create({
  baseURL: GITHUB_API_URL
})

const refreshAuthLogic = async (failedRequest: any) => {
  const token = failedRequest.config.headers.Authorization.split(' ', 2)[1]

  try {
    var owner = await GithubOwner
      .createQueryBuilder('owner')
      .where('owner.githubAccessToken = :token')
      .orWhere("owner.oldAcessTokens like :likeToken")
      .setParameters({ token: token, likeToken: `%${token}%` })
      .getOne()


    if (!owner) {
      throw new GithubApiError(`Could not find owner with token: ${token}`);
    }
  
  } catch (error) {
    throw new GithubApiError(`Error with ORM github api fetch: ${failedRequest.config.url}`, error)
  }

  const acessToken = await createInstallationToken(owner.installationId)

  owner.githubAccessToken = acessToken.token;
  owner.oldAcessTokens.push(acessToken.token);
  await owner.save()

  failedRequest.config.headers.Authorization = `token ${acessToken.token}`
  return Promise.resolve()
};

createAuthRefreshInterceptor(session, refreshAuthLogic);
// axiosRetry(session, { retries: 3 })

// https://developer.github.com/v3/repos/commits/#list-pull-requests-associated-with-commit
export async function getPullRequestsForCommit(owner: string, repo: string, commit_sha: string, token: string) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/pulls`, { headers: { 'Accept': 'application/vnd.github.groot-preview+json', 'Authorization': `token ${token}` } })
  return res.data as Octokit.ReposListPullRequestsAssociatedWithCommitResponse
}

// https://developer.github.com/v3/repos/statuses/#get-the-combined-status-for-a-specific-ref
export async function getCommitStatus(owner: string, repo: string, commit_sha: string, token: string) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/status`, { headers: { 'Authorization': `token ${token}` } })
  return res.data as Octokit.ReposListStatusesForRefResponse
}

// https://developer.github.com/v3/repos/commits/#get-a-single-commit
export async function getCommitInfo(owner: string, repo: string, commit_sha: string, token: string) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}`, { headers: { 'Authorization': `token ${token}` } })
  return res.data as Octokit.ReposGetCommitResponse
}

// https://developer.github.com/v3/repos/statuses/#get-the-combined-status-for-a-specific-ref
export async function getCommitStatuses(owner: string, repo: string, commit_sha: string, token: string) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/status`, { headers: { 'Authorization': `token ${token}` }})
  return res.data as any
}

// https://developer.github.com/v3/checks/runs/#list-check-runs-for-a-specific-ref
export async function getCommitCheckRuns(owner: string, repo: string, commit_sha: string, token: string) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/check-runs`, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.antiope-preview+json' }})
  return res.data as Octokit.ChecksListForRefResponse
}

// https://developer.github.com/v3/apps/#create-a-new-installation-token
export async function createInstallationToken(installation_id: string) {

  let privateKey = JSON.parse(process.env.GITHUB_PRIVATE_KEY)

  const jwtToken = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + (5 * 60),
    iat: Math.floor(Date.now() / 1000),
    iss: process.env.APP_ID
  }, privateKey.key, { algorithm: 'RS256' });

  var res = await axios.post(`https://api.github.com/app/installations/${installation_id}/access_tokens`, {}, { headers: { 'Accept': 'application/vnd.github.machine-man-preview+json', 'Authorization': `Bearer ${jwtToken}` } })
  return res.data as Octokit.AppsCreateInstallationTokenResponse
}

export async function requestPullRequestReview(owner: string, repo: string, pr_number: number, data: { reviewers: string[] }, token: string) {
  console.log('wtffffffffff')
  assert(data.reviewers, 'No reviewers specified for review')
  const res = await axios.post(`https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number.toString()}/requested_reviewers`, data,
    { headers: { 'Accept': 'application/vnd.github.symmetra-preview+json', 'Authorization': `token ${token}` } }
  )
  console.log('done');
  return res.data as Octokit.PullsCreateReviewRequestResponse
}

export async function removePullRequestReview(owner: string, repo: string, pr_number: number, data: Octokit.PullsDeleteReviewRequestParams, token: string) {
  assert(data.reviewers, 'No reviewers specified for review removal')
  const res = await axios.delete(`https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number.toString()}/requested_reviewers`,
    { data, headers: { 'Accept': 'application/vnd.github.symmetra-preview+json', 'Authorization': `token ${token}` } }
  )
  return res.data
}

// https://developer.github.com/v3/pulls/#merge-a-pull-request-merge-button
export async function mergePR(owner: string, repo: string, prNumber: number, token: string) {
  console.log('Log message', arguments);
  // TODO: consider merge_method parameter to support all merge modes
  const res = await axios.put(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber.toString()}/merge`, {},
    { headers: { 'Authorization': `token ${token}` }}
  )

  return res.data
}


class GithubApiError extends Error {
  original?: Error;
  new_stack?: string;

  constructor(message: string, error?: Error) {
    super(message);
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }

    if (error && this.stack) {
      this.original = error;
      this.new_stack = this.stack
      let message_lines = (this.message.match(/\n/g) || []).length + 1
      this.stack = this.stack.split('\n').slice(0, message_lines + 1).join('\n') + '\n' + error.stack
    }
  }
}