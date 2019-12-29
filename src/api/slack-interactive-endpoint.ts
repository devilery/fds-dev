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

  const client = team.getSlackClient()

  if (payload.type === 'block_actions') {
    const action = payload.actions[0]
    let actionId = ''
    if (action.value)
      actionId = action.value
    else
      actionId = action.action_id

    if (actionId.indexOf('review_assigne_') >= 0) {
      const prId = actionId.replace('review_assigne_', '')
      const modal = getModal(prId)
      try {
        await client.views.open({'trigger_id': payload.trigger_id, 'view': modal.view})
      } catch (e) {
        console.log(e)
      }
    }

    if (actionId.indexOf('review_target_user_selected_') >= 0) {
      const prId = actionId.replace('review_target_user_selected_', '')
      const modal = getModal(prId)

      const selectedUser = action.selected_user
      const selectingUser = payload.user.id

      client.views.update({'view': emptyView, 'view_id': payload.view.id})

      const user = await User.findOneOrFail({where: {slackId: selectingUser}, relations: ['githubUser']})

      const pr = await PullRequest.findOneOrFail(parseInt(prId))

      if (!user.githubUser) {
        console.log('Author does not have github user')
        return;
      }

      requestSlackUsersToReview(
        [selectedUser],
        pr.prNumber,
        user
      )
    }
  }

  if (payload.type === 'view_submission') {
    console.log(payload)
    decodeAction(payload, team)
  }
});

function decodeAction(payload: {}, team: Team) {
  const action = payload.actions[0]
  const actionName = (action.value || action.action_id || '');
  const eventName = actionName.split('___', 2)[0];
  console.log(eventName)
  if (eventName) {
    const data = JSON.parse(decodeURIComponent(actionName.split('___', 2)[1]))
    // console.log('data', data);
    data['team'] = team;
    emmit(`slack.action.${eventName}`, data)
  }
}

module.exports = router;
