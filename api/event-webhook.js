const { emmit } = require('../libs/event.js')

module.exports = async (req, res) => {
	require('../subscribers/subscribe-events.js')();

	const { body } = req;
	emmit(body.type, body);
	res.end();
}