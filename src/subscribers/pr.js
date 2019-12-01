const { sendPrOpenedMessage } = require('../libs/slack-messages.js');
const firebase = require('../libs/firebase');


const opened = async function(data) {
	await firebase.firestore().collection('pull_requests').doc(data.id.toString()).set(data)
	sendPrOpenedMessage(data, 'CR4LW3GRW', 'xoxb-7093049764-856934218934-OmjqTvxvV3NTRpyOT4lT5kut');
};
opened.eventType = 'pr.opened';

module.exports = [opened];
