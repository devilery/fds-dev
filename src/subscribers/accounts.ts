import { Team, User } from '../entity'
import { getWelcomeMessage } from '../libs/slack-messages'


const teamGhConnected = async function(team: Team) {
  (await User.find({where: {team: team}, relations: ['team']})).forEach(user => {
    const message = getWelcomeMessage(user)
    team.getSlackClient().chat.postMessage({channel: user.slackImChannelId, text: message.text})
  })
}
teamGhConnected.eventType = 'team.gh.connected'


const userCreated = async function(user: User) {
  const message = getWelcomeMessage(user)
  user.team.getSlackClient().chat.postMessage({channel: user.slackImChannelId, text: message.text})
}
userCreated.eventType = 'user.created'


module.exports = [teamGhConnected, userCreated]
