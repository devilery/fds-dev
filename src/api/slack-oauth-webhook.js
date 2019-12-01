const router = require('express').Router();
const { emmit } = require('../libs/event.js')


router.get('/', async(req, res) => {
  emmit('slack.user.authenticated', {'code': req.query.code, 'redirect_uri': req.query.redirect_uri})

  res.end()
});

module.exports = router;