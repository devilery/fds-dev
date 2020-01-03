require('dotenv').config();
require('pretty-error').start();

import dbConnect from './libs/db'
import { Team, GithubOwner } from './entity'

import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    beforeSend(event, hint) {
      const error = (hint && hint.originalException) as any;
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
import httpContext from 'express-http-context';
import setup from './auth/github/install'
import githubOAuth from './auth/github/oauth';

const { subscribe } = require('./libs/event.js');
const { handleCommands } = require('./libs/slack-commands')
const { eventMiddleware } = require('./libs/slack-events')
import './libs/http-debug';

const app = express();

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

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
        const ghOwner = await GithubOwner.findOneOrFail({where: {installationId: req.body.installation.id}, relations: ['team']})
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
  await setup(req, res)
})

app.get('/github-login', async (req, res) => {
  let query = url.parse(req.url, true).query
  githubOAuth.login(req, res, query.userId)
})

app.get('/github-callback', githubOAuth.callback)


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
