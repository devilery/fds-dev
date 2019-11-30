module.exports = async (req, res) => {
  const { body } = req
  console.log(body)
  res.end()
}