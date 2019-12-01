const router = require('express').Router();
const { emmit } = require('../libs/event.js')

const { retryBuild, jobDetails } = require('../libs/circleci')

router.get('/', async(req, res) => {
	// const { body } = req;
	// emmit(body.type, body);

	const output = [
	// await retryBuild({vcs: 'gh', username:'feature-delivery', project:'fds-dev', build_num: '90'})
	// await jobDetails({jobUrl: 'https://circleci.com/gh/feature-delivery/fds-dev/102'})
	]

	console.log(output);

	res.end();
});

module.exports = router;
