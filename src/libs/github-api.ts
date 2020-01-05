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
  const owner = await GithubOwner.findOneOrFail({where: {githubAccessToken: token}})
  const acessToken = await createInstallationToken(owner.installationId)

  owner.githubAccessToken = acessToken.token;
  await owner.save()

  failedRequest.config.headers.Authorization = `token ${acessToken.token}`
  return Promise.resolve()
};

createAuthRefreshInterceptor(session, refreshAuthLogic);

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
  return res.data as Octokit.ReposListStatusesForRefResponse
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
  assert(data.reviewers, 'No reviewers specified for review')
  console.log(data);
  const res = await axios.post(`https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number.toString()}/requested_reviewers`, data,
    { headers: { 'Accept': 'application/vnd.github.symmetra-preview+json', 'Authorization': `token ${token}` } }
  )
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
