import { Team, User, ReviewInvite, PullRequest } from '../entity'
import { getWelcomeMessage, getReviewRegisterMessage, getTutorialMessage } from '../libs/slack-messages'
import { IRequestGithubReviewLogin } from '../events/types'
import assert from '../libs/assert'


const teamGhConnected = async function(team: Team) {
  (await User.find({where: {team: team}, relations: ['team']})).forEach(user => {
    const message = getWelcomeMessage(user)
    team.getSlackClient().chat.postMessage({channel: user.slackImChannelId, text: message.text})
  })
}
teamGhConnected.eventType = 'team.gh.connected'


const githubOAuthDone = async function(user_id: number) {
  assert(!!user_id, 'User id must be in event args...')

  const user = await User.findOneOrFail(user_id);
  const team = await user.relation('team');
  const message = getTutorialMessage();
  team.getSlackClient().chat.postMessage({ channel: user.slackImChannelId, blocks: message.blocks, text: message.text  })
}

githubOAuthDone.eventType = 'github.oauth.done'

const userCreated = async function(user: User) {
  const message = getWelcomeMessage(user)
  user.team.getSlackClient().chat.postMessage({channel: user.slackImChannelId, text: message.text})
}
userCreated.eventType = 'user.created'


const requestGithubReviewLogin = async function(event: IRequestGithubReviewLogin) {
  const user = await User.findOneOrFail(event.user_id, { relations: ['team'] });
  const author = await User.findOneOrFail(event.author_user_id);
  const pr = await PullRequest.findOneOrFail({ where: { user: author, prNumber: event.pr_number }, relations: ['user'] })

  const authorUsername = await author.getSlackUsername();
  const client = user.team.getSlackClient();

  let message = getReviewRegisterMessage(user, authorUsername);

  user.metadata = { reviewPR: event.pr_number, prAuthor: event.author_user_id } as any
  await user.save()

  await client.chat.postMessage({ channel: user.slackImChannelId, text: message.text, link_names: true })

  await ReviewInvite.findOrCreate({ user: user, pullRequest: pr })
  await pr.updateMainMessage()
}
requestGithubReviewLogin.eventType = 'github.user.create.request.review'


module.exports = [teamGhConnected, userCreated, requestGithubReviewLogin, githubOAuthDone]
