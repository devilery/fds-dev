const router = require('express').Router();
const { emmit } = require('../libs/event.js')

const { retryBuild } = require('../libs/circleci')

router.get('/', async(req, res) => {
	// const { body } = req;
	// emmit(body.type, body);

	// retryBuild({vcs: 'gh', username:'feature-delivery', project:'fds-dev', build_num: '90'})


	res.end();
});

module.exports = router;
