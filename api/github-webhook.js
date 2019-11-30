module.exports = async (req, res) => {
  const { body } = req
  
  console.log(body)
  switch (true) {
    case !!body.pull_request:
      console.log('pull request')
      console.log(body.pull_request)
      console.log(body)
      break;
    default:
      console.log('untracked event')
      break;
  }
  res.status(200).end()
}

