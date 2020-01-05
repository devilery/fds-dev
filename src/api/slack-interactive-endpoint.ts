import { strict as assert } from 'assert';
import httpContext from 'express-http-context';
const router = require('express').Router();
const { emmit } = require('../libs/event.js')
import { Team, User, PullRequest } from '../entity'
import { requestSlackUsersToReview } from '../libs/github'

function getModal(prId) {
  return {
    "response_action": "push",
    "view": {
        "type": "modal",
        "title": {
          "type": "plain_text",
          "text": "Review assign shit...",
          "emoji": true
        },
        "close": {
          "type": "plain_text",
          "text": "Close",
          "emoji": true
        },
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "plain_text",
              "text": "...",
              "emoji": true
            }
          },
          {
            "type": "section",
            "block_id": "section678",
            "text": {
              "type": "mrkdwn",
              "text": "Pick a user from the dropdown list"
            },
            "accessory": {
              "action_id": "review_target_user_selected_" + prId,
              "type": "users_select",
              "placeholder": {
                "type": "plain_text",
                "text": "Select an item"
              }
            }
          }
        ]
      }
    }
}

const emptyView = {
  "type": "modal",
  "title": {
    "type": "plain_text",
    "text": "Review assign shit...",
    "emoji": true
  },
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "plain_text",
        "text": "assigned :) you can close the view now",
        "emoji": true
      }
    }
  ]
}

router.post('/', async(req, res) => {
  const payload = JSON.parse(req.body.payload)
  res.send('ok')

  const team = httpContext.get('team') as Team
  assert(team, 'No team found in context')

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
    emmit(`slack.action.${eventName}`, data)
  }
}

module.exports = router;
