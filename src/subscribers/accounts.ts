import { Team, User } from '../entity'
import { getWelcomeMessage, getReviewRegisterMessage } from '../libs/slack-messages'
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

const requestGithubReviewLogin = async function(event: IRequestGithubReviewLogin) {
  const user = await User.findOneOrFail(event.user_id, { relations: ['team'] });
  const author = await User.findOneOrFail(event.author_user_id);
  const authorUsername = await author.getSlackUsername();
  const client = user.team.getSlackClient();

  let message = getReviewRegisterMessage(user, authorUsername);

  user.metadata = { reviewPR: event.pr_number, prAuthor: event.author_user_id } as any
  await user.save()

  await client.chat.postMessage({ channel: user.slackImChannelId, text: message.text, link_names: true })
}
requestGithubReviewLogin.eventType = 'github.user.request.review.create'


module.exports = [teamGhConnected, userCreated, requestGithubReviewLogin]
