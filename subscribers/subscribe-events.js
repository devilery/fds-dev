const { subscribe } = require('../libs/event.js')
const pipeline = require('../libs/pipeline.js')

module.exports = function() {
	subscribe('pipeline.started', pipeline.started);
	subscribe('pipeline.started', pipeline.finished);
};