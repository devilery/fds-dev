import express from 'express'
import config from '../config';
import { emmit } from '../libs/event'

const router = express.Router()

export interface ISlackUserAuthenticatedEvent {
  code: string
}

router.get('/', async(req: any, res: any) => {
  var eventData: ISlackUserAuthenticatedEvent = {'code': req.query.code}
  await emmit('slack.user.authenticated', eventData)

  res.statusCode = 302
  res.setHeader('location', config.authRedirectUrls.slackAuth)
  res.end()
})

export default router
