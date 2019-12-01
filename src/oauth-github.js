var request = require('request')
var events = require('events')
var url = require('url')

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
      + '&state=' + userId
      ;
    resp.statusCode = 302
    resp.setHeader('location', u)
    resp.end()
  }

  function callback(req, resp, cb) {
    var query = url.parse(req.url, true).query
    var code = query.code
    if (!code) return emitter.emit('error', { error: 'missing oauth code' }, resp)
    var u = 'https://github.com/login/oauth/access_token'
      + '?client_id=' + opts.githubClient
      + '&client_secret=' + opts.githubSecret
      + '&code=' + code
      + '&state=' + query.state;
  
    request.get({ url: u, json: true }, function (err, tokenResp, body) {
      if (err) {
        if (cb) {
          err.body = body
          err.tokenResp = tokenResp
          return cb(err)
        }
        return emitter.emit('error', body, err, resp, tokenResp, req, query.state)
      }
      if (cb) {
        cb(null, body)
      }
      emitter.emit('token', body, resp, query.state, tokenResp, req)
    })
  }

  emitter.login = login
  emitter.callback = callback
  return emitter
}