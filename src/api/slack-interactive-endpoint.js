const router = require('express').Router();
const { emmit } = require('../libs/event.js')


router.post('/', async(req, res) => {
  console.log(req.body)
  emmit('slack.interaction', 'test')
  res.send('ok')
});

module.exports = router;