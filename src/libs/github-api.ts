//@ts-ignore
import { strict as assert } from 'assert'
import axios from 'axios';
import jwt from 'jsonwebtoken';
import Sentry from '@sentry/node';
import createAuthRefreshInterceptor from 'axios-auth-refresh';
import { GithubOwner } from '../entity'
const GITHUB_API_URL = 'https://api.github.com'

const session = axios.create({
  baseURL: GITHUB_API_URL
})

const refreshAuthLogic = async (failedRequest: any) => {
  const token: string = failedRequest.config.headers.Authorization.split(' ', 2)[1]

  if (token.length === 40) {
    throw new GithubApiError(`User token: ${token} throwed 401. Cannot autorefresh.`)
  }

  var owner = await GithubOwner
    .createQueryBuilder('owner')
    .where('owner.githubAccessToken = :token')
    .orWhere("owner.oldAcessTokens like :likeToken")
    .setParameters({ token: token, likeToken: `%${token}%` })
    .getOne()

  if (!owner) {
    throw new GithubApiError(`Could not find owner with token: ${token}`);
  }
  const acessToken = await createInstallationToken(owner.installationId)

  owner.oldAcessTokens.push(owner.githubAccessToken);
  owner.githubAccessToken = acessToken.token;
  await owner.save()

  failedRequest.config.headers.Authorization = `token ${acessToken.token}`
  return Promise.resolve()
};


createAuthRefreshInterceptor(session, refreshAuthLogic);


// https://developer.github.com/v3/repos/commits/#list-pull-requests-associated-with-commit
export async function getPullRequestsForCommit(owner: string, repo: string, commit_sha: string, token: string) {
  const error = new GithubApiError();
  
  try {
    let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/pulls`, { headers: { 'Accept': 'application/vnd.github.groot-preview+json', 'Authorization': `token ${token}` } })
    return res.data as Octokit.ReposListPullRequestsAssociatedWithCommitResponse 
  } catch (e) {
    error.message = e.message;
    throw error
  }
}

// https://developer.github.com/v3/repos/commits/#get-a-single-commit
export async function getCommitInfo(owner: string, repo: string, commit_sha: string, token: string) {
  const error = new GithubApiError();

  try {
    let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}`, { headers: { 'Authorization': `token ${token}` } })
    return res.data as Octokit.ReposGetCommitResponse 
  } catch (e) {
    error.message = e.message
    throw e
  }
}

// https://developer.github.com/v3/repos/statuses/#get-the-combined-status-for-a-specific-ref
export async function getCommitStatuses(owner: string, repo: string, commit_sha: string, token: string) {
  const error = new GithubApiError();

  try {
    let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/status`, { headers: { 'Authorization': `token ${token}` } })
    return res.data as any
  } catch (e) {
    error.message = e.message;
    throw error
  }
}

// https://developer.github.com/v3/checks/runs/#list-check-runs-for-a-specific-ref
export async function getCommitCheckRuns(owner: string, repo: string, commit_sha: string, token: string) {
  const error = new GithubApiError();

  try {
    let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/check-runs`, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.antiope-preview+json' } })
    return res.data as Octokit.ChecksListForRefResponse 
  } catch (e) {
    error.message = e.message;
    throw error;
  }
}

export async function getInstallationRepos(token: string) {

  try {
    let data = await fetchPage()
    return data;
  } catch (error) {
    Sentry.captureException(error)
    console.error(error)
    throw error;
  }

  async function fetchPage(nextPage?: string) { 
    let url = nextPage ? nextPage : 'https://api.github.com/installation/repositories'
    let response = await session.get(url, { params: { per_page: 100 }, headers: { 'Accept': 'application/vnd.github.machine-man-preview+json', 'Authorization': `token ${token}` } })
    const linkHeader = response.headers.link;
    const parsedHeader = parseLinkHeader(linkHeader);
    let nextPageData: any[] = []
    if (parsedHeader?.next) {
      nextPageData = await fetchPage(parsedHeader.next);
    }
    const pageData = response.data.repositories;
    return pageData.concat(nextPageData);
  }
}

// https://developer.github.com/v3/apps/#create-a-new-installation-token
export async function createInstallationToken(installation_id: string) {

  let privateKey = JSON.parse(process.env.GITHUB_PRIVATE_KEY)

  const jwtToken = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + (5 * 60),
    iat: Math.floor(Date.now() / 1000),
    iss: process.env.APP_ID
  }, privateKey.key, { algorithm: 'RS256' });

  const error = new GithubApiError();

  try {
    var res = await axios.post(`https://api.github.com/app/installations/${installation_id}/access_tokens`, {}, { headers: { 'Accept': 'application/vnd.github.machine-man-preview+json', 'Authorization': `Bearer ${jwtToken}` } })
    return res.data as Octokit.AppsCreateInstallationTokenResponse 
  } catch (e) {
    error.message = e.message
    throw error
  }
}

export async function getInstallationInfo(installation_id: string) {
  let privateKey = JSON.parse(process.env.GITHUB_PRIVATE_KEY)

  const jwtToken = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + (5 * 60),
    iat: Math.floor(Date.now() / 1000),
    iss: process.env.APP_ID
  }, privateKey.key, { algorithm: 'RS256' });

  const error = new GithubApiError();

  try {
    var res = await axios.get(`https://api.github.com/app/installations/${installation_id}`, { headers: { 'Accept': 'application/vnd.github.machine-man-preview+json', 'Authorization': `Bearer ${jwtToken}` } })
    return res.data as Octokit.AppsGetInstallationResponse
  } catch (e) {
    error.message = e.message
    throw error
  }
}

export async function requestPullRequestReview(owner: string, repo: string, pr_number: number, data: { reviewers: string[] }, token: string) {
  assert(data.reviewers, 'No reviewers specified for review')
  const error = new GithubApiError();

  try {
    const res = await session.post(`/repos/${owner}/${repo}/pulls/${pr_number.toString()}/requested_reviewers`, data,
      { headers: { 'Accept': 'application/vnd.github.symmetra-preview+json', 'Authorization': `token ${token}` } }
    )
    return res.data as Octokit.PullsCreateReviewRequestResponse 
  } catch (e) {
    error.message = e.message;
    throw error 
  }
}

export async function removePullRequestReview(owner: string, repo: string, pr_number: number, data: Octokit.PullsDeleteReviewRequestParams, token: string) {
  assert(data.reviewers, 'No reviewers specified for review removal')
  const error = new GithubApiError();

  try {
    const res = await session.delete(`/repos/${owner}/${repo}/pulls/${pr_number.toString()}/requested_reviewers`,
      { data, headers: { 'Accept': 'application/vnd.github.symmetra-preview+json', 'Authorization': `token ${token}` } }
    )
    return res.data 
  } catch (e) {
    error.message = e.message;
    throw error
  }
}

// https://developer.github.com/v3/pulls/#merge-a-pull-request-merge-button
export async function mergePR(owner: string, repo: string, prNumber: number, token: string) {
  // TODO: consider merge_method parameter to support all merge modes
  const error = new GithubApiError();

  try {
    const res = await session.put(`/repos/${owner}/${repo}/pulls/${prNumber.toString()}/merge`, {},
      { headers: { 'Authorization': `token ${token}` } }
    )

    return res.data 
  } catch (e) {
    error.message = e.message;
    throw error
  }
}

class GithubApiError extends Error {
  original?: Error;
  new_stack?: string;

  constructor(message?: string, code?: string) {
    super(message);
    this.name = 'GithubApiError';
    (this as any).code = code
  }
}

function parseLinkHeader(data: any) {
  if (!data) {
    return;
  }

  let arrData = data.split("link:")
  data = arrData.length == 2 ? arrData[1] : data;
  let parsed_data: any = {}

  arrData = data.split(",")

  for (let d of arrData) {
    let linkInfo: any = /<([^>]+)>;\s+rel="([^"]+)"/ig.exec(d)

    parsed_data[linkInfo[2]] = linkInfo[1]
  }

  return parsed_data;
}