module.exports = async (req, res) => {
  const { body } = req
  const eventName = req.headers['x-github-event']
  
  switch (eventName) {
    case 'pull_request':
      
      break;
    default:
      console.log('untracked event')
      break;
  }
  res.status(200).end()
}

