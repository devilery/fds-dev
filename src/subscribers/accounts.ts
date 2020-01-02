import { Team, User } from '../entity'
import { getWelcomeMessage } from '../libs/slack-messages'
import { IRequestGithubReviewLogin } from '../events/types'


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

const RequestGithubReviewLogin = async function(event: IRequestGithubReviewLogin) {
  console.log('event');
}
RequestGithubReviewLogin.eventType = 'github.user.request.review.create'


module.exports = [teamGhConnected, userCreated]
