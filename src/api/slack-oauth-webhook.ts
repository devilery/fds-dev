import express from 'express'
import config from '../config';
import { emmit } from '../libs/event'
import { Team, User } from '../entity';
import { WebClient } from '@slack/web-api';
import { OauthAccessResult, TeamInfoResult } from '../libs/slack-api';
import { createUser } from '../libs/users';

const router = express.Router()


router.get('/', async(req: any, res: any) => {
  const authInfo = await (new WebClient()).oauth.access({
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    redirect_uri: process.env.SLACK_OAUTH_REDIRECT_URI,
    code: req.query.code
  }) as OauthAccessResult;

  const client = new WebClient(authInfo.bot.bot_access_token)
  const teamInfo = await client.team.info() as TeamInfoResult

  const [team, created] = await Team.findOrCreate({ slackId: teamInfo.team.id }, { slackId: teamInfo.team.id, slackBotAccessToken: authInfo.bot.bot_access_token  })

  let user = await User.findOne({ where: { slackId: authInfo.user_id } })
  if (!user) {
    user = await createUser(authInfo.user_id, team)
  }

  res.statusCode = 302

  if (created) {
    const authUrl = Buffer.from(process.env.GH_APP_INSTAL_URL + `?state=${team.id}`).toString('base64')
    res.setHeader('location', `${config.authRedirectUrls.slackInstall}?install=${authUrl}`)
  } else {
    const authUrl = Buffer.from(process.env.GH_OAUTH_URL + `?userId=${user.id}`).toString('base64')
    res.setHeader('location', `${config.authRedirectUrls.slackAuth}?github=${authUrl}`)
  }

  res.end()
})

export default router
