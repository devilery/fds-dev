const { createEventAdapter } = require('@slack/events-api');
import { Team, PullRequest } from '../entity'
import { getPrMessage } from './slack-messages'

if (!process.env.SLACK_SIGNING_SECRET) {
  throw 'Missing SLACK_SIGNING_SECRET. Slack webhooks wont work.'
}

const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET, {
	includeBody: true,
	waitForResponse: true
});

const CIRCLE_TOKEN = /circle (\w+)/;

const INSTALL_URL = `\
https://slack.com/oauth/authorize?client_id=${process.env.SLACK_CLIENT_ID}\
&scope=channels:history,chat:write:bot,groups:history,identify,im:history,mpim:history,team:read,users.profile:read,users:read,bot\
`;

// https://api.slack.com/surfaces/tabs/using#publishing
// https://api.slack.com/events/app_home_opened
// https://api.slack.com/methods/views.publish
async function handleHomePage(event, payload, respond) {
	// console.log('event', event, payload);

	if(event.tab !== 'home') return;

	const team = await Team.findOneOrFail({where: {slackId: payload.team_id}})
	// console.log(team);
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


  	const allPRs = await PullRequest.find()
  	console.log('prs', allPRs, 'user', event.user);
  	if(!allPRs.length) {
  		await client.views.publish({
			"user_id": event.user,
		  	"view": {
		       "type":"home", "blocks": [
		  			{
						"type": "section",
						"text": {
							"type": "mrkdwn",
							"text": "open your first PR!"
						}
					},
					{
						"type": "actions",
						"elements": [
							{
								"type": "button",
								"text": {
									"type": "plain_text",
									"emoji": true,
									"text": "Install (default redirect uri)"
								},
								"style": "primary",
								"url": INSTALL_URL,
								"value": "install_app"
							},
							// {
							// 	"type": "button",
							// 	"text": {
							// 		"type": "plain_text",
							// 		"emoji": true,
							// 		"text": "Kin Khao"
							// 	},
							// 	"value": "click_me_123"
							// },
							// {
							// 	"type": "button",
							// 	"text": {
							// 		"type": "plain_text",
							// 		"emoji": true,
							// 		"text": "Ler Ros"
							// 	},
							// 	"value": "click_me_123"
							// }
						]
					}
		  		]
	   		}
	   	})
  	}

  	// TODO: next stuff
  	// return;

  	allPRs.forEach(async pr => {
	   	const messageData = getPrMessage(pr)

		// client.chat.postMessage({text: messageData.text, blocks: messageData.blocks, channel: pr.user.slackImChannelId}) as ChatPostMessageResult
	  	const res = await  client.views.publish({
		"user_id": event.user,
	  	"view": {
	       "type":"home", /*text:messageData.text, */"blocks": [
	  			{
					"type": "section",
					"text": {
						"type": "mrkdwn",
						"text": "*PRs you own:*"
					}
				},
				...messageData.blocks,
				{
					"type": "section",
					"text": {
						"type": "mrkdwn",
						"text": "*No PRs are waiting for your review*"
					}
				},
				{
					"type": "section",
					"text": {
						"type": "mrkdwn",
						"text": `_Updated at ${(new Date).toLocaleTimeString()} ${(new Date).toLocaleDateString()}_`
					}
				},
	  		]
	   	}})
  	})


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
