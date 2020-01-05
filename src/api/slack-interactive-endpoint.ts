import { strict as assert } from 'assert';
import httpContext from 'express-http-context';
const router = require('express').Router();
const { emmit } = require('../libs/event.js')
import { Team } from '../entity'

router.post('/', async(req, res) => {
  const payload = JSON.parse(req.body.payload)
  res.send('ok')

  const team = httpContext.get('team') as Team
  assert(team, 'No team found in context')

  console.log(payload)

  if (payload && payload.actions) {
    decodeAction(payload, team)
  }
});

function decodeAction(payload: {actions: Array<{}>}, team: Team) {
  const action = payload.actions[0]
  const actionName = (action.value || action.action_id || '');
  const eventName = actionName.split('___', 2)[0];
  console.log(eventName)
  if (eventName) {
    console.log(`---------------------\n ${actionName} \n----------------------------`)
    const data = JSON.parse(decodeURIComponent(actionName.split('___', 2)[1]))
    // console.log('data', data);
    data['team'] = team;
    data['eventData'] = action;
    console.log(data);
    emmit(`slack.action.${eventName}`, data)
  }
}

module.exports = router;
