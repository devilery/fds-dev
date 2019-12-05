var request = require('request')
var events = require('events')
var url = require('url')
const { firestore } = require('./libs/firebase');
const axios = require('axios');

module.exports = function (opts) {
  if (!opts.callbackURI) opts.callbackURI = '/github/callback'
  if (!opts.loginURI) opts.loginURI = '/github/login'
  if (typeof opts.scope === 'undefined') opts.scope = 'user'
  var urlObj = url.parse(opts.baseURL)
  urlObj.pathname = url.resolve(urlObj.pathname, opts.callbackURI)
  var redirectURI = url.format(urlObj)
  var emitter = new events.EventEmitter()

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
    var query = url.parse(req.url, true).query
    var code = query.code
    if (!code) return emitter.emit('error', { error: 'missing oauth code' }, resp)
    var u = 'https://github.com/login/oauth/access_token'
      + '?client_id=' + opts.githubClient
      + '&client_secret=' + opts.githubSecret
      + '&code=' + code
      + '&state=' + query.state;

    let tokenResp = await axios.get(u, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } });
    let token = tokenResp.data

    let user = await axios.get('https://api.github.com/user', { headers: { 'Authorization': `token ${token.access_token}` } })
    user = user.data
    let appUser = firestore.collection('users').doc(query.state)

    firestore.collection('gh_users').doc(user.id.toString()).set({
      github_username: user.login,
      github_id: user.id,
      github_access_token: token.access_token,
      raw_github_user_data: user,
      user_ref: appUser
    })

    resp.end('Thanks, close the tab and create a new PR :)')
  }

  emitter.login = login
  emitter.callback = callback
  return emitter
}