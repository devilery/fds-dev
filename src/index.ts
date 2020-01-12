
require('dotenv').config();

if (process.env.NODE_ENV === 'development') {
  console.log('Turning on pretty errors')
  require('pretty-error').start();
}

// This allows TypeScript to detect our global value
declare global {
  namespace NodeJS {
    interface Global {
      __rootdir__: string;
    }
  }
}

require('express-async-errors');
import { RewriteFrames } from '@sentry/integrations';
import dbConnect from './libs/db'
import { Team, GithubOwner, User, GithubUser } from './entity'
import * as Sentry from '@sentry/node';
global.__rootdir__ = __dirname || process.cwd();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    beforeSend(event, hint) {
      const error = (hint && hint.originalException) as any;
      if (error && error.message && error.message.match(/Request failed with status code 40[134]/i)) {
        return null;
      }
      return event;
    },
    integrations: [new RewriteFrames({
      root: global.__rootdir__
    })]
  });
}

import url from 'url';
const port = process.env.PORT || 3000;

import path from 'path';
import fs from 'fs';
import express from 'express';
import morgan from 'morgan';
import httpContext from 'express-http-context';
const moesifExpress = require('moesif-express');

import setup from './auth/github/install'
import githubOAuth from './auth/github/oauth';

const { subscribe } = require('./libs/event.js');
const { handleCommands } = require('./libs/slack-commands')
const { eventMiddleware } = require('./libs/slack-events')

if (process.env.LOG_THAT_HTTP_BODY || process.env.LOG_THAT_HTTP_HEADERS) {
  require('log-that-http')
} else {
  require('./libs/http-debug')
}

import { mixpanelMiddleware } from './libs/analytics'

const app = express();

const moesifMiddleware = process.env.MOESIF_APPLICATION_ID
  ? moesifExpress({
    applicationId: process.env.MOESIF_APPLICATION_ID,

    logBody: true,

    identifyUser: function identifyUser(req: express.Request, res: express.Response) {
      return req.user ? req.user.id : undefined;
    },

    identifyCompany: function identifyCompany(req: express.Request, res: express.Response) {
      return req.team ? req.team.id : undefined;
    },

    skip: function skipMoesif(req: express.Request, res: express.Response) {
      return req.path === '/test' || req.path === '/api/test'
    }
  })
  : undefined;

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

app.use(morgan('dev'));

// TODO: remove or reenable for home page handling
// TODO: provide context to this handler as well
// app.use('/api/slack-events', eventMiddleware())

// these middlwares are breaking the slack event middleware above for some reason
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

app.use(httpContext.middleware)

// TODO: unify with analytics middlware
app.use(async (req, res, next) => {
  // console.log(req.url, req.headers['x-github-event'], req.body);

  // installation: {
  //   id: 5874996,
  //   node_id: 'MDIzOkludGVncmF0aW9uSW5zdGFsbGF0aW9uNTg3NDk5Ng=='
  // }
  let err, user: User | undefined, team: Team | undefined;
  try {
    if (req.headers['x-github-event']) {
      console.log('[github]', req.headers['x-github-event'])
      const { body } = req;
      if (body.sender.id) {
        const ghOwner = await GithubOwner.findOne({where: {installationId: req.body.installation.id}, relations: ['team']})
        if (ghOwner) {
          httpContext.set('team', ghOwner.team)
          httpContext.set('owner', ghOwner);

          const githubUser = await GithubUser.findOne({where: { githubId: body.sender.id }})
          user = await User.findOne({ where: { githubUser: githubUser, team: ghOwner.team } })
          user && httpContext.set('user', user)
          team = ghOwner.team;

          Sentry.configureScope(function (scope) {
            scope.setTag('team', team.id.toString());
            scope.setTag('origin', 'github_event')
            scope.setTag('event_name', req.headers['x-github-event'] as any)
          });
        } else {
          res.status(404).send('owner not found')
          return;
        }
      }
    }
    else if (req.headers['x-slack-signature']) {
      if (!req.body || !req.body.payload) {
        // slack sends empty messages when we dont have necessary permission
        // and other edge cases
        next();
        return;
      }
      // TODO: slack auth
      const { body: { payload } } = req;
      // console.log(req.headers, body)
      const data = JSON.parse(payload)
      team = await Team.findOneOrFail({where: {slackId: data.team.id}});
      user = await User.findOneOrFail({where: {slackId: data.user.id}})
      user && httpContext.set('user', user)

      Sentry.configureScope(function (scope) {
        scope.setTag('team', team.id.toString());
        scope.setTag('origin', 'slack_event')
        scope.setTag('event_name', data.type || '???')
      });
      // console.log(team)
      httpContext.set('team', team)
    }
  } catch(e) {
    console.error(e)
    err = e;
  }

  if (moesifMiddleware && user) {
    req.user = user;

    var userProps = {
      userId: ''+user.id,
      companyId: team ? ''+team.id : undefined, // If set, associate user with a company object
      // campaign: {
      //   utmSource: 'google',
      //   utmMedium: 'cpc',
      //   utmCampaign: 'adwords',
      //   utmTerm: 'api+tooling',
      //   utmContent: 'landing'
      // },
      metadata: {
        slackId: user.slackId,
        // firstName: 'John',
        // lastName: 'Doe',
        name: user.name,
        // title: 'Software Engineer',
        // salesInfo: {
        //     stage: 'Customer',
        //     lifetimeValue: 24000,
        //     accountOwner: 'mary@contoso.com'
        // }
      }
    };

    moesifMiddleware.updateUser(userProps, console.log);
  }

  if (team) {
    req.team = team

    // Only companyId is required.
    // Campaign object is optional, but useful if you want to track ROI of acquisition channels
    // See https://www.moesif.com/docs/api#update-a-company for campaign schema
    // metadata can be any custom object
    var companyProps = {
      companyId: ''+team.id,
      // TODO: get from slack webhooks
      // companyDomain: 'acmeinc.com', // If domain is set, Moesif will enrich your profiles with publicly available info
      // campaign: {
      //   utmSource: 'google',
      //   utmMedium: 'cpc',
      //   utmCampaign: 'adwords',
      //   utmTerm: 'api+tooling',
      //   utmContent: 'landing'
      // },
      metadata: {
        // orgName: 'Acme, Inc',
        // planName: 'Free Plan',
        // dealStage: 'Lead',
        // mrr: 24000,
        // demographics: {
        //   alexaRanking: 500000,
        //   employeeCount: 47
        // }
      }
    };

    moesifMiddleware.updateCompany(companyProps, console.log);
  }

  next(err)
})

if (moesifMiddleware) {
  app.use(moesifMiddleware);
}

app.use(mixpanelMiddleware)

app.post('/slack/commands', async (req, res) => {
  handleCommands(req, res)
})

app.get('/test', async (req, res) => {
  res.send(200)
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
