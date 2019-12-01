const url = require('url')
// const port = process.env.PORT || 3000;

const path = require('path');
const fs = require('fs');
const githubOAuth = require('./oauth-github')
const morgan = require('morgan');
const express = require('express');
const { subscribe } = require('./libs/event.js');
const { firestore } = require('./libs/firebase');
const axios = require('axios');

function fdsApp(app) {
  // const app = express();

  let ghOAuth = githubOAuth({
    githubClient: 'Iv1.41db150bf340e5c0',
    githubSecret: 'c001a3111c76ff42c68aa9302e41a3cf3d22b607',
    baseURL: 'http://localhost:3000',
    loginURI: '/fds/github-login',
    callbackURI: '/fds/github-callback',
    scope: 'user' // optional, default scope is set to user
  })

  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/github-login', async (req, res) => {
    let query = url.parse(req.url, true).query
    ghOAuth.login(req, res, query.userId)
  })

  app.get('/github-callback', ghOAuth.callback)

  ghOAuth.on('error', function (err) {
    console.error('there was a login error', err)
  })

  ghOAuth.on('token', async(token, serverResponse, userId) => {
    let user = await axios.get('https://api.github.com/user', { headers: {'Authorization': `token ${token.access_token}` } })
    user = user.data

    firestore.collection('users').doc(userId).update({
      github_username: user.login,
      github_id: user.id,
      github_access_token: token.access_token,
      raw_github_user_data: user
    })

    serverResponse.end('Thanks close the tab')
  })

  const apiPath = path.join(__dirname, 'api');
  fs.readdirSync(apiPath)
    .filter(file => { return (file.slice(-3) === '.js'); })
    .forEach(file => {
      let baseRoute = `/api/${path.basename(file).split('.').slice(0, -1).join('.')}`;
      let router = require(path.join(apiPath, file));
      app.use(baseRoute, router);
    });


  const subscribersPath = path.join(__dirname, 'subscribers');
  fs.readdirSync(subscribersPath)
    .filter(file => { return (file.slice(-3) === '.js'); })
    .forEach(file => {
    	subscribe();
    	let subscribers = require(path.join(subscribersPath, file)).forEach(subscriber => {
    		subscribe(subscriber.eventType,  subscriber);
    	});
    });
}


// app.listen(port, err => {
//   if (err) throw err
//   console.log(`> Ready on server http://localhost:${port}`)
// });

module.exports = {
  fdsApp
}
