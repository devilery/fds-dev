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

  failedRequest.config.headers.Authorization = `token ${acessToken.token}`
  return Promise.resolve()
};

createAuthRefreshInterceptor(session, refreshAuthLogic);

// https://developer.github.com/v3/repos/commits/#list-pull-requests-associated-with-commit
async function getPullRequestsForCommit(owner: string, repo: string, commit_sha: string, token: string) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/pulls`, { headers: { 'Accept': 'application/vnd.github.groot-preview+json', 'Authorization': `token ${token}` } })
  return res.data as Octokit.ReposListPullRequestsAssociatedWithCommitResponse
}

// https://developer.github.com/v3/repos/statuses/#get-the-combined-status-for-a-specific-ref
async function getCommitStatus(owner: string, repo: string, commit_sha: string, token: string) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/status`, { headers: { 'Authorization': `token ${token}` } })
  return res.data as Octokit.ReposListStatusesForRefResponse
}

// https://developer.github.com/v3/repos/commits/#get-a-single-commit
async function getCommitInfo(owner: string, repo: string, commit_sha: string, token: string) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}`, { headers: { 'Authorization': `token ${token}` } })
  return res.data as Octokit.ReposGetCommitResponse
}

// https://developer.github.com/v3/apps/#create-a-new-installation-token
async function createInstallationToken(installation_id: string) {

  let privateKey = JSON.parse(process.env.GITHUB_PRIVATE_KEY)

  const jwtToken = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + (5 * 60),
    iat: Math.floor(Date.now() / 1000),
    iss: process.env.APP_ID
  }, privateKey.key, { algorithm: 'RS256' });

  var res = await axios.post(`https://api.github.com/app/installations/${installation_id}/access_tokens`, {}, { headers: { 'Accept': 'application/vnd.github.machine-man-preview+json', 'Authorization': `Bearer ${jwtToken}` } })
  return res.data as Octokit.AppsCreateInstallationTokenResponse
}

export { createInstallationToken, getPullRequestsForCommit, getCommitStatus, getCommitInfo }
