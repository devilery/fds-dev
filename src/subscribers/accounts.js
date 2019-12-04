const { firestore } = require('../libs/firebase')
const { sendWelcomeMessage } = require('../libs/slack-messages');


const teamGhConnected = async function(team_id) {
  let teamRef = await firestore.collection('teams').doc(team_id)
  let team = await teamRef.get()
  let usersRefs = await firestore.collection('users').get()
  let users = usersRefs.docs.map(doc => doc.data()).filter(async user => {
    let teamIdTeam = team.data().id
    let teamGet = await user.team.get()
    let teamIdUser = await teamGet.data().id
    return teamIdTeam == teamIdUser
  })

  users.forEach(user => {
    let redirectUrl = process.env.APP_BASE_URL + `/github-login?userId=${user.id}`
    sendWelcomeMessage(true, redirectUrl, user.slack_im_channel_id, team.data().slack_bot_access_token)
  })
}
teamGhConnected.eventType = 'team.gh.connected'


const userCreated = async function(user) {
  let team = await user.team.get()
  team = team.data()
  if (!team.githubConnected) {
      var redirectUrl = process.env.GH_APP_INSTAL_URL + `?state=${team.id}`
  } else {
      var redirectUrl = process.env.APP_BASE_URL + `/github-login?userId=${user.id}`
  }
  sendWelcomeMessage(team.githubConnected, redirectUrl, user.slack_im_channel_id, team.slack_bot_access_token)
}
userCreated.eventType = 'user.created'


module.exports = [teamGhConnected, userCreated]
