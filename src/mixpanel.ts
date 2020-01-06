import * as express from 'express';
import httpContext from 'express-http-context';
import Mixpanel from 'mixpanel';

import { GithubOwner, GithubUser, User, Team } from './entity'

if (!process.env.MIXPANEL_TOKEN) {
  console.error('Missing MIXPANEL_TOKEN env var')
}

// TODO: exceptin when no token???
// https://help.mixpanel.com/hc/en-us/articles/115004497803
export const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN, {
    // test: true,
    debug: !!process.env.MIXPANEL_DEBUG,
    // host: 'api.mixpanel.com',
    // protocol: 'https'
})

// console.log(mixpanel.config)

export async function mixpanelMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  let err: Error;
  let user: User | undefined;
  let team: Team | undefined;

  try {
    if (req.headers['x-github-event']) {
      console.log('[github]', req.headers['x-github-event'])
      const { body } = req;
      if (body.sender.id) {
        const ghOwner = await GithubOwner.findOne({where: {installationId: req.body.installation.id}, relations: ['team']})
        if (ghOwner) {
          // httpContext.set('team', ghOwner.team)

          team = ghOwner.team;
          const githubUser = await GithubUser.findOne({where: { githubId: body.sender.id }})
          user = await User.findOne({ where: { githubUser: githubUser, team } })
        } else {
          // res.status(404).send('owner not found')
          // return;
        }
      }
    }
    else if (req.headers['x-slack-signature']) {
      // TODO: slack auth
      const { body: { payload } } = req;
      // console.log(req.headers, payload)
      console.log('[slack]', '???')
      const data = JSON.parse(payload)
      const team = await Team.findOneOrFail({where: {slackId: data.team.id}});
      // console.log(team)
      // httpContext.set('team', team)
    }
  } catch(e) {
    console.error(e)
    err = e;
  }

  if (user) {
    const teamProps = team ? {
      team_id: team.id,
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
  } else {
    console.log('Untracked request')
  }

  mixpanel.track('Test event', {
      distinct_id: user ? user.id : undefined,
      // ip: '127.0.0.1'
  });

  next(/*err*/);
}
