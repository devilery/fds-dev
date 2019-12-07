require('dotenv').config();
import dbConnect from './libs/db'
import { Team, GithubOwner, Repository } from './entity'

import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

import url from 'url';
const port = process.env.PORT || 3000;

import path from 'path';
import fs from 'fs';
import express from 'express';
import morgan from 'morgan';
import axios from 'axios';

import githubOAuth from './oauth-github';


import { createInstallationToken } from './libs/github-api';
const { subscribe, emmit } = require('./libs/event.js');
const { firestore } = require('./libs/firebase');
const { honeycomb } = require('./libs/honeycomb');
const { handleCommands } = require('./libs/slack-commands')
const { eventMiddleware } = require('./libs/slack-events')


const app = express();

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

let ghOAuth = githubOAuth({
  githubClient: process.env.GITHUB_APP_PUBLIC_KEY,
  githubSecret: process.env.GITHUB_APP_SECRET_KEY,
  baseURL: process.env.GITHUB_OAUTH_BASE_URL,
  loginURI: '/github-login',
  callbackURI: '/github-callback',
  scope: 'user' // optional, default scope is set to user
})

app.use(morgan('dev'));

app.use('/slack/events', eventMiddleware())

app.use(express.json());
app.use(express.urlencoded())

app.use('/slack/commands', express.urlencoded())
app.post('/slack/commands', async (req, res) => {
  handleCommands(req, res)
})

app.post('/slack/events', async (req, res) => {
  res.end();
})

app.get('/github/setup', async (req, res) => {
  let query = url.parse(req.url, true).query
  let installation_id = query.installation_id as string
  let team_id = query.state
  let setup_action = query.setup_action

  const team = await Team.findOne({ where: { id: team_id } })

  if (!team) {
    res.end('Could not find team!')
    return;
  }

  if (setup_action === 'install') {
    team.githubConnected = true
    await team.save()

    const data = await createInstallationToken(installation_id)
    const owner = GithubOwner.create({
      githubAccessToken: data.token,
      installationId: installation_id,
      team: team,
      githubAccessTokenRaw: data
    })

    await owner.save()

    let resRepos = await axios.get(`https://api.github.com/installation/repositories`, { headers: { 'Accept': 'application/vnd.github.machine-man-preview+json', 'Authorization': `token ${data.token}` }})
    let repos = resRepos.data.repositories

    for (let repo of repos) {
      const repository = Repository.create({
        githubId: repo.id,
        rawData: repo,
        owner: owner
      })

      await repository.save()
    }
  }

  emmit('team.gh.connected', team_id)
  res.end('done')
})


app.get('/github-login', async (req, res) => {
  let query = url.parse(req.url, true).query
  ghOAuth.login(req, res, query.userId)
})


app.get('/github-callback', ghOAuth.callback)


const apiPath = path.join(__dirname, 'api');
fs.readdirSync(apiPath)
  .filter(file => { return (['.js', '.ts'].includes(file.slice(-3))); })
  .forEach(file => {
    let baseRoute = `/api/${path.basename(file).split('.').slice(0, -1).join('.')}`;
    let router = require(path.join(apiPath, file));
    app.use(baseRoute, router);
  });


const subscribersPath = path.join(__dirname, 'subscribers');
fs.readdirSync(subscribersPath)
.filter(file => { return (['.js', '.ts'].includes(file.slice(-3))); })
  .forEach(file => {
  	subscribe();
  	let subscribers = require(path.join(subscribersPath, file)).forEach((subscriber: any) => {
  		subscribe(subscriber.eventType,  subscriber);
  	});
  });

app.get('/debug-sentry', function mainHandler(req, res) {
  throw new Error('My first Sentry error!');
});

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

app.use(function onError(err: any, req: any, res: any, next: any) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

(async() => {
  var db = await dbConnect();
  await db.synchronize();
  app.listen(port, () => {
    console.log(`> Ready on server http://localhost:${port}`)
  });
})();
