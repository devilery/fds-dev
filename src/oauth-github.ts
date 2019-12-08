import request from 'request';
import events from 'events';
import url from 'url'
import axios from 'axios';

import { GithubUser, User, Repository } from './entity';
import { requestPullRequestReview } from './libs/github-api';

export default function (opts) {
  if (!opts.callbackURI) opts.callbackURI = '/github/callback'
  if (!opts.loginURI) opts.loginURI = '/github/login'
  if (typeof opts.scope === 'undefined') opts.scope = 'user'
  var urlObj = url.parse(opts.baseURL)
  urlObj.pathname = url.resolve(urlObj.pathname, opts.callbackURI)
  var redirectURI = url.format(urlObj)

  function login(req, resp, userId) {
    var u = 'https://github.com/login/oauth/authorize'
      + '?client_id=' + opts.githubClient
      + (opts.scope ? '&scope=' + opts.scope : '')
      + '&redirect_uri=' + redirectURI
      + '&state=' + userId;

    resp.statusCode = 302
    resp.setHeader('location', u)
    resp.end()
  }

  async function callback(req, resp, cb) {
    const query = url.parse(req.url, true).query
    const code = query.code
    const u = 'https://github.com/login/oauth/access_token'
      + '?client_id=' + opts.githubClient
      + '&client_secret=' + opts.githubSecret
      + '&code=' + code
      + '&state=' + query.state;

    // // https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/#2-users-are-redirected-back-to-your-site-by-github
    const tokenResp = await axios.get(u, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } });
    const token = tokenResp.data // as Octokit.oauth

    // https://developer.github.com/v3/users/#get-the-authenticated-user
    const userRes = await axios.get('https://api.github.com/user', { headers: { 'Authorization': `token ${token.access_token}` } })
    const user = userRes.data as Octokit.UsersGetAuthenticatedResponse

    const appUser = await User.findOneOrFail({ where: { id: query.state }, relations: ['githubUser'] })
    let githubUser = appUser.githubUser

    if (githubUser) {
      githubUser.githubAccessToken = token.access_token
      githubUser.rawGithubUserData = user
      await githubUser.save()
    } else {
      const createdGithubUser = GithubUser.create({
        githubUsername: user.login,
        githubId: user.id,
        githubAccessToken: token.access_token,
        rawGithubUserData: user as any,
      })

      await createdGithubUser.save()

      githubUser = appUser.githubUser = createdGithubUser
      await appUser.save()
    }

    if (appUser.metadata && appUser.metadata.reviewPR) {
      // send request review
      const repo = await Repository.findOneOrFail();
      const author = await GithubUser.findOneOrFail(appUser.metadata.prAuthor)
      requestPullRequestReview(
        repo.rawData.owner.login,
        repo.rawData.name,
        appUser.metadata.reviewPR,
        {reviewers:[githubUser.githubUsername]},
        author.githubAccessToken
      )
      resp.end('Thanks! You can now review the PR :)')
    } else {
      resp.end('Thanks, close the tab and create a new PR :)')
    }
  }

  this.login = login
  this.callback = callback

  return this
}
