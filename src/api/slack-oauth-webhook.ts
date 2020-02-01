import express from 'express'
import config from '../config';
import { emmit } from '../libs/event'
import { Team, User } from '../entity';
import { WebClient } from '@slack/web-api';
import { OauthAccessResult, TeamInfoResult, UsersInfoResult } from '../libs/slack-api';
import { createUser } from '../libs/users';
import { updateUser } from '../libs/analytics'


const router = express.Router()


router.get('/', async(req: any, res: any) => {
  try {
    var authInfo = await (new WebClient()).oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      redirect_uri: process.env.SLACK_OAUTH_REDIRECT_URI,
      code: req.query.code
    }) as OauthAccessResult;
  } catch(e) {
    console.log(e)
    throw e
  }

  const client = new WebClient(authInfo.bot.bot_access_token)
  const teamInfo = await client.team.info() as TeamInfoResult

  const [team, created] = await Team.findOrCreate(
    { slackId: teamInfo.team.id },
    {
      slackId: teamInfo.team.id, 
      slackName: teamInfo.team.name,
      slackDomain: teamInfo.team.domain,
      slackBotAccessToken: authInfo.bot.bot_access_token,
    }
  )

  let user = await User.findOne({ where: { slackId: authInfo.user_id } })
  if (user) {
    user.slackUserToken = authInfo.access_token
    await user.save()
  } else {
    user = await createUser(authInfo.user_id, team, authInfo.access_token)
    user.trackEvent('User created')  // TS bug, user can't be undefined here
  }

  const userInfo = await client.users.info({user: authInfo.user_id}) as UsersInfoResult

  if (userInfo && userInfo.user) {
    const data = {}
    if (userInfo.user.profile.email) {
      data['$email'] = userInfo.user.profile.email;
    }
    if (userInfo.user.profile.image_512) {
      data['$avatar'] = userInfo.user.profile.image_512;
    }
    if (teamInfo.team.domain) {
      data['team_slack_name'] = teamInfo.team.domain;
    }
    updateUser(user.id, data)
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
