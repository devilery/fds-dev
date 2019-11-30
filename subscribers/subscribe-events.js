const { subscribe } = require('../libs/event.js');
const slack = require('../subscribers/slack.js');
const pipeline = require('../subscribers/pipeline.js');
const pr = require('../subscribers/pipeline.js')

module.exports = function() {
	subscribe('pr.opend', pr.opened);

	subscribe('slack.user.authenticated', slack.authenticated);

	subscribe('pipeline.started', pipeline.started);
	subscribe('pipeline.finished', pipeline.finished);
};