const axios = require('axios')
const GITHUB_API_URL = 'https://api.github.com'

async function getPullRequestsForCommit(owner, repo, commit_sha) {
  let res = await axios.post(`${GITHUB_API_URL}/repos/${owner}/${repo}/commits/${commit_sha}/pulls`)
  let data = await res.json()
  return data
}

module.exports = {
  getPullRequestsForCommit
}