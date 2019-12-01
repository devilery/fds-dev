const router = require('express').Router();
const { emmit } = require('../libs/event.js')


router.get('/', async(req, res) => {
  emmit('slack.user.authenticated', {'code': req.query.code, 'redirect_uri': process.env.SLACK_OAUTH_REDIRECT_URI})
  res.end()
});

module.exports = router;