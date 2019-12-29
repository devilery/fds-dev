require('dotenv').config();
import dbConnect from './libs/db'
import { Team, GithubOwner, Repository, GithubUser } from './entity'

import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    beforeSend(event, hint) {
      const error = hint && hint.originalException;
      if (error && error.message && error.message.match(/Request failed with status code 40[134]/i)) {
        return null;
      }
      return event;
    }
  });
}

import url from 'url';
const port = process.env.PORT || 3000;

import path from 'path';
import fs from 'fs';
import express from 'express';
import morgan from 'morgan';
import axios from 'axios';
import httpContext from 'express-http-context';

import githubOAuth from './oauth-github';


import { createInstallationToken } from './libs/github-api';
import { strict as assert } from 'assert';
const { subscribe, emmit } = require('./libs/event.js');
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

// TODO: provide context to this handler as well
app.use('/api/slack-events', eventMiddleware())

// these middlwares are breaking the slack event middleware above for some reason
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

app.use(httpContext.middleware)

app.use(async (req, res, next) => {
  // console.log(req.url, req.headers['x-github-event'], req.body);

  // installation: {
  //   id: 5874996,
  //   node_id: 'MDIzOkludGVncmF0aW9uSW5zdGFsbGF0aW9uNTg3NDk5Ng=='
  // }
  let err;
  try {
    if (req.headers['x-github-event']) {
      console.log('[github]', req.headers['x-github-event'])
      const { body } = req;
      if (body.sender.id) {
        // console.log('installation', body.installation.id)
        // const ghUser = await GithubUser.findOneOrFail({where: {githubId: req.body.sender.id}, relations: ['users']})
        const ghOwner = await GithubOwner.findOneOrFail({where: {installationId: req.body.installation.id}, relations: ['team']})
        // console.log(ghOwner.team)

        httpContext.set('team', ghOwner.team)
      }
    }
    else if (req.headers['x-slack-signature']) {
      // TODO: slack auth
      const { body: { payload } } = req;
      // console.log(req.headers, payload)
      const data = JSON.parse(payload)
      const team = await Team.findOneOrFail({where: {slackId: data.team.id}});
      // console.log(team)
      httpContext.set('team', team)
    }
  } catch(e) {
    console.error(e)
    err = e;
  }

  next(err)
})

app.post('/slack/commands', async (req, res) => {
  handleCommands(req, res)
})

app.get('/test', async (req, res) => {
  res.end('test done')
})

// app.post('/api/slack/events', async (req, res) => {
//   console.log('req', res, res);
//   res.end();
// })

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

    // https://developer.github.com/v3/apps/installations/#list-repositories
    let resRepos = await axios.get(`https://api.github.com/installation/repositories`, { headers: { 'Accept': 'application/vnd.github.machine-man-preview+json', 'Authorization': `token ${data.token}` } })
    let repos = (resRepos.data as Octokit.AppsListInstallationReposForAuthenticatedUserResponse).repositories

    assert(repos.length > 0, 'Installation has no repos!')

    const owner = GithubOwner.create({
      githubAccessToken: data.token,
      login: repos[0].owner.login,
      installationId: installation_id,
      team: team,
      githubAccessTokenRaw: data as any
    })

    await owner.save()

    for (let repo of repos) {
      const repository = Repository.create({
        githubId: repo.id,
        name: repo.name,
        rawData: repo as any,
        owner: owner
      })

      await repository.save()
    }
    emmit('team.gh.connected', team)
  }
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
    let mod = require(path.join(apiPath, file));
    if (typeof mod === 'function') {
      var router: any = mod;
    } else {
      var router: any = mod.default;
    }
    app.use(baseRoute, router);
  });


const subscribersPath = path.join(__dirname, 'subscribers');
fs.readdirSync(subscribersPath)
.filter(file => { return (['.js', '.ts'].includes(file.slice(-3))); })
  .forEach(file => {
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
