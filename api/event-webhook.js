module.exports = async (req, res) => {
  const { body } = req.body
  console.log(body)
  req.end()
}