import request from 'request';
import events from 'events';
import url from 'url'
import axios from 'axios';

import { GithubUser, User, Repository, PullRequest } from './entity';
import { requestPullRequestReview } from './libs/github-api';

export default function (opts: any) {
  if (!opts.callbackURI) opts.callbackURI = '/github/callback'
  if (!opts.loginURI) opts.loginURI = '/github/login'
  if (typeof opts.scope === 'undefined') opts.scope = 'user'
  var urlObj = url.parse(opts.baseURL)
  urlObj.pathname = url.resolve(urlObj.pathname as any, opts.callbackURI)
  var redirectURI = url.format(urlObj)

  function login(req: any, resp: any, userId: string) {
    var u = 'https://github.com/login/oauth/authorize'
      + '?client_id=' + opts.githubClient
      + (opts.scope ? '&scope=' + opts.scope : '')
      + '&redirect_uri=' + redirectURI
      + '&state=' + userId;

    resp.statusCode = 302
    resp.setHeader('location', u)
    resp.end()
  }

  async function callback(req: any, resp: any, cb: any) {
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
    const githubUser = await GithubUser.findOne({ where: { githubId: user.id } })

    if (githubUser) {
      githubUser.githubAccessToken = token.access_token
      githubUser.rawGithubUserData = user
      appUser.githubUser = githubUser
      await appUser.save()
      await githubUser.save()
    } else {
      const createdGithubUser = GithubUser.create({
        githubUsername: user.login,
        githubId: user.id,
        githubAccessToken: token.access_token,
        rawGithubUserData: user as any,
      })

      await createdGithubUser.save()

      appUser.githubUser = createdGithubUser
      await appUser.save()
    }

    await appUser.reload()

    // TODO: add repo info (multiple PRs can have same IDs)
    if (appUser.metadata && appUser.metadata.reviewPR) {
      // send request review
      const pr = await PullRequest.findOneOrFail({where: {prNumber: appUser.metadata.reviewPR}, relations: ['repository']})
      const repo = pr.repository;
      // const repo = await Repository.findOneOrFail(appUser.metadata.reviewRepo);
      const author = await GithubUser.findOneOrFail(appUser.metadata.prAuthor)
      requestPullRequestReview(
        repo.owner.login,
        repo.name,
        appUser.metadata.reviewPR,
        {reviewers:[githubUser.githubUsername]},
        author.githubAccessToken
      )
      resp.set('Content-type', 'text/html')
      resp.end(`Thanks! You can now review the PR :) <a href="https://github.com/${repo.owner.login}/${repo.name}/pull/${appUser.metadata.reviewPR}">here</a>`)
    } else {
      resp.end('Thanks, close the tab and create a new PR :)')
    }
  }

  this.login = login
  this.callback = callback

  return this
}
