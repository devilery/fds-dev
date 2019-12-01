const axios = require('axios')
const GITHUB_API_URL = 'https://api.github.com'

const session = axios.create({
  baseURL: GITHUB_API_URL
})

async function getPullRequestsForCommit(owner, repo, commit_sha, token) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/pulls`, { headers: { 'Accept': 'application/vnd.github.groot-preview+json', 'Authorization': `token ${token}` } })
  return res.data
}

module.exports = {
  getPullRequestsForCommit
}