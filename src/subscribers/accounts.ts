import {sendWelcomeMessage} from '../libs/slack-messages'
import {Team, User} from '../entity'


const teamGhConnected = async function(team: Team) {
  const users = await User.find({where: {team: team}})
  users.forEach(user => {
    let redirectUrl = process.env.APP_BASE_URL + `/github-login?userId=${user.id}`
    sendWelcomeMessage(true, redirectUrl, user.slackImChannelId, team.slackBotAccessToken)
  })
}
teamGhConnected.eventType = 'team.gh.connected'


const userCreated = async function(user: User) {
  if (user.team.githubConnected) {
    var redirectUrl = process.env.APP_BASE_URL + `/github-login?userId=${user.slackId}`
  } else {
    var redirectUrl = process.env.GH_APP_INSTAL_URL + `?state=${user.team.slackId}`
  }
  sendWelcomeMessage(user.team.githubConnected, redirectUrl, user.slackImChannelId, user.team.slackBotAccessToken)
}
userCreated.eventType = 'user.created'


module.exports = [teamGhConnected, userCreated]
