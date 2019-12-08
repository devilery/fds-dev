import express from 'express'
import { emmit } from '../libs/event'

const router = express.Router()

export interface ISlackUserAuthenticatedEvent {
  code: string
}

router.get('/', async(req: any, res: any) => {
  var eventData: ISlackUserAuthenticatedEvent = {'code': req.query.code}
  emmit('slack.user.authenticated', eventData)
  res.send('Now check your Slack messages :)')
})

export default router
