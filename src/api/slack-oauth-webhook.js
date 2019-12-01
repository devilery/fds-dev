const router = require('express').Router();
const { emmit } = require('../libs/event.js')


router.post('/', async(req, res) => {
  const { body } = req
  emmit('slack.user.authenticated', {'code': body['code']})

  res.end()
});

module.exports = router;