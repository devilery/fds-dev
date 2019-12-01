const axios = require('axios')
const GITHUB_API_URL = 'https://api.github.com'

function getPullRequestsForCommit(owner, repo, commit_sha) {
  return new Promise(async (resolve, reject) => {
    try {
      let res = await axios.post(`${GITHUB_API_URL}/repos/${owner}/${repo}/commits/${commit_sha}/pulls`)
      let data = await res.json()
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = {
  getPullRequestsForCommit
}