import assert from '../libs/assert'
import httpContext from 'express-http-context';
const router = require('express').Router();
const { emmit } = require('../libs/event.js')
import { Team } from '../entity'

router.post('/', async(req, res) => {
  const payload = JSON.parse(req.body.payload)
  res.send('ok')

  const team = httpContext.get('team') as Team | undefined
  assert(team, 'No team found in context')

  if (payload && payload.actions) {
    decodeAction(payload, team)
  }
});

function decodeAction(payload: {actions: Array<{}>}, team: Team) {
  const action = payload.actions[0]
  const actionName = (action.value || action.action_id || '');
  const eventName = actionName.split('___', 2)[0];
  if (eventName) {
    const data = JSON.parse(decodeURIComponent(actionName.split('___', 2)[1]))
    data['team'] = team;
    data['eventData'] = action;
    emmit(`slack.action.${eventName}`, data)
  }
}

module.exports = router;
