const axios = require('axios')
const GITHUB_API_URL = 'https://api.github.com'
const jwt = require('jsonwebtoken');
const createAuthRefreshInterceptor = require('axios-auth-refresh').default;
const { firestore } = require('./firebase');

const session = axios.create({
  baseURL: GITHUB_API_URL
})

const refreshAuthLogic = async failedRequest => {
  let token = failedRequest.config.headers.Authorization.split(' ', 2)[1]
  let owners = await firestore.collection('github_owners', ref => ref.where('github_access_token', '==', token)).get()
  let owner = owners.docs.map(doc => doc)[0]
  let acessToken = await createInstallationToken(owner.data().installation_id)

  await owner.ref.update({ github_access_token: acessToken.token, expires_at: acessToken.expires_at })

  failedRequest.config.headers.Authorization = `token ${acessToken.token}`
  return Promise.resolve()
};

createAuthRefreshInterceptor(session, refreshAuthLogic);

async function getPullRequestsForCommit(owner, repo, commit_sha, token) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/pulls`, { headers: { 'Accept': 'application/vnd.github.groot-preview+json', 'Authorization': `token ${token}` } })
  return res.data
}

async function getCommitStatus(owner, repo, commit_sha, token) {
  try {
    let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/status`, { headers: { 'Authorization': `token ${token}` } })
    return res.data
  } catch (error) {
    console.error(error)
    return;
  }
}

async function getCommitInfo(owner, repo, commit_sha, token) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}`, { headers: { 'Authorization': `token ${token}` } })
  return res.data
}

async function createInstallationToken(installation_id) {
  let privateKey = JSON.parse(process.env.GITHUB_PRIVATE_KEY)

  const jwtToken = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + (5 * 60),
    iat: Math.floor(Date.now() / 1000),
    iss: process.env.APP_ID
  }, privateKey.key, { algorithm: 'RS256' });

  try {
    var res = await axios.post(`https://api.github.com/app/installations/${installation_id}/access_tokens`, {}, { headers: { 'Accept': 'application/vnd.github.machine-man-preview+json', 'Authorization': `Bearer ${jwtToken}` } })
  } catch(e) {
    console.log(e)
  }

  let data = res.data
  return data
}

module.exports = {
  getPullRequestsForCommit,
  createInstallationToken,
  getCommitStatus,
  getCommitInfo
}