import { strict as assert } from 'assert';
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

    const appUser = await User.findOneOrFail({ where: { id: query.state } })
    const [ githubUser, _ ] = await GithubUser.findOrCreate<GithubUser>(
      {githubId: user.id},
      { githubUsername: user.login, githubAccessToken: token.access_token, rawGithubUserData: user }
    )

    // update existing
    githubUser.githubAccessToken = token.access_token;
    githubUser.rawGithubUserData = user;
    await githubUser.save();

    appUser.githubUser = githubUser;
    await appUser.save();

    await appUser.reload()

    // TODO: add repo info (multiple PRs can have same IDs)
    if (appUser.metadata && appUser.metadata.reviewPR) {
      // send request review
      const pr = await PullRequest.findOneOrFail({where: {prNumber: appUser.metadata.reviewPR}, relations: ['repository', 'repository.owner']})
      const repo = pr.repository;
      // const repo = await Repository.findOneOrFail(appUser.metadata.reviewRepo);
      const author = await User.findOneOrFail(appUser.metadata.prAuthor, {relations: ['githubUser']})

      assert(author.githubUser, 'Missing github user relation')

      await requestPullRequestReview(
        repo.owner.login,
        repo.name,
        appUser.metadata.reviewPR,
        {reviewers:[githubUser.githubUsername]},
        author.githubUser!.githubAccessToken
      )
  
      resp.set('Content-type', 'text/html')
      resp.end(`Thanks! You can now review the PR :) <a href="https://github.com/${repo.owner.login}/${repo.name}/pull/${appUser.metadata.reviewPR}">here</a>`)

      appUser.metadata = null;
      await appUser.save()

    } else {
      resp.end('Thanks, close the tab and create a new PR :)')
    }
  }

  this.login = login
  this.callback = callback

  return this
}
