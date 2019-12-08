import { Team, User } from '../entity'
import { getWelcomeMessageText } from '../libs/slack-messages'


const teamGhConnected = async function(team: Team) {
  team.users.forEach(user => {
    const client = team.getSlackClient()
    const text = getWelcomeMessageText(true, process.env.APP_BASE_URL + `/github-login?userId=${user.id}`)
    client.chat.postMessage({channel: user.slackImChannelId, text: text})
  })
}
teamGhConnected.eventType = 'team.gh.connected'


const userCreated = async function(user: User) {
  const client = user.team.getSlackClient()
  const text = getWelcomeMessageText(user.team.githubConnected, process.env.APP_BASE_URL + `/github-login?userId=${user.id}`)
  client.chat.postMessage({channel: user.slackImChannelId, text: text})
}
userCreated.eventType = 'user.created'


module.exports = [teamGhConnected, userCreated]
