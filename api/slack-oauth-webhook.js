const { emmit } = require('../libs/event.js')

module.exports = async (req, res) => {
  const { body } = req
  emmit('slack.user.authenticated', {'code': body['code']})

  res.end()
}