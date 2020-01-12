import assert from './assert';
import * as express from 'express';
import httpContext from 'express-http-context';
import Mixpanel from 'mixpanel';

import { GithubOwner, GithubUser, User, Team } from '../entity'

export let mixpanel: Mixpanel.Mixpanel | undefined;

if (process.env.MIXPANEL_TOKEN) {
  // https://help.mixpanel.com/hc/en-us/articles/115004497803
  mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN, {
    // test: true,
    debug: !!process.env.MIXPANEL_DEBUG,
    test: !!process.env.MIXPANEL_DEBUG,
    protocol: 'https'
  })
} else {
  console.error('Missing MIXPANEL_TOKEN env var')
}



export async function mixpanelMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!mixpanel) return next();

  let err: Error;
  let user: User | undefined;
  let team: Team | undefined;

  try {
    if (req.headers['x-github-event']) {
      const { body } = req;

      if (body.sender.id) {
        const ghOwner = await GithubOwner.findOne({where: {installationId: req.body.installation.id}, relations: ['team']})

        if (ghOwner) {
          team = ghOwner.team;
          const githubUser = await GithubUser.findOneOrFail({where: { githubId: body.sender.id }})
          user = await User.findOneOrFail({ where: { githubUser: githubUser, team } })
        }
      }
    }
    else if (req.headers['x-slack-signature']) {
      const { body: { payload } } = req;

      const data = JSON.parse(payload)
      team = await Team.findOneOrFail({where: {slackId: data.team.id}});
      user = await User.findOneOrFail({where: {slackId: data.user.id}})
    }
  } catch(e) {
    // console.error(e)
    err = e;
  }

  if (user) {
    const teamProps = team ? {
      team_id: team.id,
      user_feature_flags: JSON.stringify(user.featureFlags),
      team_feature_flags: JSON.stringify(team.featureFlags),
      // ...Object.keys(team.featureFlags).reduce((props, flag) => {
      //   if (team.featureFlags[flag]) {
      //     props[`feature_flag_${flag}`] = true;
      //   }
      //   return props
      // }, {})
    } : {};

    mixpanel.people.set(''+user.id, {
      $name: user.name,
      $created: user.createdAt.toISOString(),
      ...teamProps,
    });

    httpContext.set('analyticsUser', user)
    httpContext.set('analyticsTeam', team)
  } else if (req.path !== '/test') {
    console.log('⚠️ Untracked request')
  }

  next(/*err*/);
}

export function trackEvent(name: string, properties: Mixpanel.PropertyDict = {}) {
  if (!mixpanel) return;

  const user = httpContext.get('analyticsUser') as User | undefined;

  if (!properties.distinct_id) {
    assert(user, 'Missing user for event tracking')
  }

  mixpanel.track(name, {
    distinct_id: user ? ''+user.id : undefined,
    ...properties
  })
}

export function updateUser(distinctId: User['id'], properties: Mixpanel.PropertyDict) {
  if (!mixpanel) return;

  mixpanel.people.set(''+distinctId, properties);
}
