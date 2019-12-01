const { sendPrOpenedMessage } = require('../libs/slack-message.js');
const { createOrUpdatePr } = require('../libs/pr');

const opened = async function(data) {
	createOrUpdatePr(data)
	sendPrOpenedMessage(data, 'CR4LW3GRW', 'xoxb-7093049764-856934218934-OmjqTvxvV3NTRpyOT4lT5kut');
};

opened.eventType = 'pr.opened';

module.exports = [opened];
