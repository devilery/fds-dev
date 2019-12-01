const { sendPrOpenedMessage } = require('../libs/slack.js');

const opened = async function(data) {
	sendPrOpenedMessage(data, 'CR4LW3GRW', 'xoxb-7093049764-856934218934-D96ynEZHxu4fFqVX3SpDhvPT');
}
opened.eventType = 'pr.opened';

module.exports = [opened];
