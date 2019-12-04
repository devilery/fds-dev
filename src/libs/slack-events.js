const { createEventAdapter } = require('@slack/events-api');

if (!process.env.SLACK_SIGNING_SECRET) {
  throw 'Missing SLACK_SIGNING_SECRET. Slack webhooks wont work.'
}

const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);

const CIRCLE_TOKEN = /circle (\w+)/;

function eventMiddleware() {
  slackEvents.on('message', (event) => {
    console.log(`Received a message event: user ${event.user} in channel ${event.channel} says ${event.text}`);

    const m = event.text && event.text.match(CIRCLE_TOKEN);
    if (m && m[1]) {
      console.log('token:', m[1]);
    }
  });

  return slackEvents.requestListener()
}

module.exports = { eventMiddleware }
