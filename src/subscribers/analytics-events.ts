import { Team, User, ReviewInvite, PullRequest } from '../entity'
import { updateUser, trackEvent } from '../libs/analytics'

// TODO: we send an event only sometimes
// const userCreated = async function userCreated(user: User) {
//   console.log('tack user created')
//   user.trackEvent('User created')
// }
// userCreated.eventType = 'user.created'

module.exports = [/*userCreated*/]
