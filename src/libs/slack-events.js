const { createEventAdapter } = require('@slack/events-api');
import { Team } from '../entity'

if (!process.env.SLACK_SIGNING_SECRET) {
  throw 'Missing SLACK_SIGNING_SECRET. Slack webhooks wont work.'
}

const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET, {
	includeBody: true,
	waitForResponse: true
});

const CIRCLE_TOKEN = /circle (\w+)/;

// https://api.slack.com/surfaces/tabs/using#publishing
async function handleHomePage(event, payload, respond) {
	console.log('event', event, payload);

	const team = await Team.findOneOrFail({where: {slackId: payload.team_id}})
	console.log(team);
  	const client = team.getSlackClient()

  	// client.chat.postMessage({"channel": event.channel, "type":"home", "blocks": [
  	// 	{
			// 	"type": "section",
			// 	"text": {
			// 		"type": "mrkdwn",
			// 		"text": "Hey there 👋 I'm TaskBot. I'm here to help you create and manage tasks in Slack.\nThere are two ways to quickly create tasks:"
			// 	}
			// },
  	// ]})

  	client.views.publish({
	"user_id": event.user,
  	"view": {
       "type":"home", "blocks": [
  			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": "Hey there 👋 I'm TaskBot. I'm here to help you create and manage tasks in Slack.\nThere are two ways to quickly create tasks:"
				}
			},
  		]
   	}})

  	// respond(null, {blocks: [
  	// 	{
			// 	"type": "section",
			// 	"text": {
			// 		"type": "mrkdwn",
			// 		"text": "Hey there 👋 I'm TaskBot. I'm here to help you create and manage tasks in Slack.\nThere are two ways to quickly create tasks:"
			// 	}
			// },
  	// ]})

	// respond(null, {
	// 	"blocks": [
	// 		{
	// 			"type": "section",
	// 			"text": {
	// 				"type": "mrkdwn",
	// 				"text": "Hey there 👋 I'm TaskBot. I'm here to help you create and manage tasks in Slack.\nThere are two ways to quickly create tasks:"
	// 			}
	// 		},
	// 		{
	// 			"type": "section",
	// 			"text": {
	// 				"type": "mrkdwn",
	// 				"text": "*1️⃣ Use the `/task` command*. Type `/task` followed by a short description of your tasks and I'll ask for a due date (if applicable). Try it out by using the `/task` command in this channel."
	// 			}
	// 		},
	// 		{
	// 			"type": "section",
	// 			"text": {
	// 				"type": "mrkdwn",
	// 				"text": "*2️⃣ Use the _Create a Task_ action.* If you want to create a task from a message, select `Create a Task` in a message's context menu. Try it out by selecting the _Create a Task_ action for this message (shown below)."
	// 			}
	// 		},
	// 		{
	// 			"type": "image",
	// 			"title": {
	// 				"type": "plain_text",
	// 				"text": "Create a task",
	// 				"emoji": true
	// 			},
	// 			"image_url": "https://api.slack.com/img/blocks/bkb_template_images/onboardingComplex.jpg",
	// 			"alt_text": "image1"
	// 		},
	// 		{
	// 			"type": "section",
	// 			"text": {
	// 				"type": "mrkdwn",
	// 				"text": "➕ To start tracking your team's tasks, *add me to a channel* and I'll introduce myself. I'm usually added to a team or project channel. Type `/invite @TaskBot` from the channel or pick a channel on the right."
	// 			},
	// 			"accessory": {
	// 				"type": "conversations_select",
	// 				"placeholder": {
	// 					"type": "plain_text",
	// 					"text": "Select a channel...",
	// 					"emoji": true
	// 				}
	// 			}
	// 		},
	// 		{
	// 			"type": "divider"
	// 		},
	// 		{
	// 			"type": "actions",
	// 			"elements": [
	// 				{
	// 					"type": "button",
	// 					"text": {
	// 						"type": "plain_text",
	// 						"text": "Create a new task",
	// 						"emoji": true
	// 					},
	// 					"style": "primary",
	// 					"value": "click_me"
	// 				},
	// 				{
	// 					"type": "button",
	// 					"text": {
	// 						"type": "plain_text",
	// 						"text": "View tasks",
	// 						"emoji": true
	// 					},
	// 					"value": "click_me"
	// 				},
	// 				{
	// 					"type": "button",
	// 					"text": {
	// 						"type": "plain_text",
	// 						"text": "Help",
	// 						"emoji": true
	// 					},
	// 					"value": "click_me"
	// 				}
	// 			]
	// 		}
	// 	]
	// })
}

// https://slack.dev/node-slack-sdk/events-api#custom-responses
function eventMiddleware() {
  slackEvents.on('message', (event) => {
    console.log(`Received a message event: user ${event.user} in channel ${event.channel} says ${event.text}`);

    const m = event.text && event.text.match(CIRCLE_TOKEN);
    if (m && m[1]) {
      console.log('token:', m[1]);
    }
  });

  slackEvents.on('app_home_opened', handleHomePage)

  return slackEvents.requestListener()
}

module.exports = { eventMiddleware }
