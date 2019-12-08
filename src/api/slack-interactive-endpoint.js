const router = require('express').Router();
const { emmit } = require('../libs/event.js')


router.post('/', async(req, res) => {
  console.log(req.body)
  const payload = JSON.parse(req.body.payload)
  emmit('slack.interaction', payload)
  res.send('ok')
});

module.exports = router;