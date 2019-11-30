module.exports = async (req, res) => {
  const { body } = req
  const eventName = req.get('X-GitHub-Event')
  
  switch (eventName) {
    case 'pull_request':
      console.log('pull request')
      break;
    default:
      console.log('untracked event')
      break;
  }
  res.status(200).end()
}

