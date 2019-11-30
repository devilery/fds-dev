const { emmit } = require('../libs/events.js')

module.exports = async (req, res) => {
  const { body } = req;
  emmit(body.type, body.data);
  res.end();
}