const { subscribe } = require('../libs/event.js')
const pipeline = require('../subscribers/pipeline.js')

module.exports = function() {
	subscribe('pipeline.started', pipeline.started);
	subscribe('pipeline.finished', pipeline.finished);
};