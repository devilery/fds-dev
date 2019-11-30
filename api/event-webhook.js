const { emmit } = require('../libs/event.js')

module.exports = async (req, res) => {
  const { body } = req;
  emmit(body.type, body.data);
  res.end();
}