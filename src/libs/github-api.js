const axios = require('axios')
const GITHUB_API_URL = 'https://api.github.com'

const session = axios.create({
  baseURL: GITHUB_API_URL,
  headers: { 'Authorization': `token ${process.env.GITHUB_API_TOKEN}` }
})

async function getPullRequestsForCommit(owner, repo, commit_sha) {
  let res = await session.get(`/repos/${owner}/${repo}/commits/${commit_sha}/pulls`, { headers: { 'Accept': 'application/vnd.github.groot-preview+json' } })
  return res.data
}

module.exports = {
  getPullRequestsForCommit
}