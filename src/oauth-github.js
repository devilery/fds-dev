import request from 'request';
import events from 'events';
import url from 'url'
import { GithubUser, User } from './entity';
import axios from 'axios';

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

    const tokenResp = await axios.get(u, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } });
    const token = tokenResp.data

    const userRes = await axios.get('https://api.github.com/user', { headers: { 'Authorization': `token ${token.access_token}` } })
    const user = userRes.data

    const appUser = await User.findOneOrFail({ where: { id: query.state } })
    const githubUser = appUser.githubUser

    if (appUser.githubUser) {
      await githubUser.save({
        githubAccessToken: token.access_token,
        rawGithubUserData: user,
      })
    } else {
      const createdGithubUser = GithubUser.create({
        githubUsername: user.login,
        githubId: user.id,
        githubAccessToken: token.access_token,
        rawGithubUserData: user,
      })

      await createdGithubUser.save()

      appUser.githubUser = createdGithubUser
      appUser.save()
    }

    resp.end('Thanks, close the tab and create a new PR :)')
  }

  this.login = login
  this.callback = callback

  return this
}