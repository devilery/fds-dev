// @ts-ignore
import { strict as assert } from 'assert';
import { Team, PullRequest } from '../entity'
import { mergePR } from '../libs/github-api'



const actionMerge = async function(data: {pr: number, team: Team}) {
	console.log('event action Merge', data);
	console.log('Merge PR number', data['pr']);
	const pr = await PullRequest.findOneOrFail(data.pr, { relations:['user', 'user.githubUser'] });
	// const user = await User.findOneOrFail(pr.user.id, {relations:['githubUser']});
	console.log(pr.user.githubUser);
	assert(pr.user.githubUser, 'Github User for PR not found')
	mergePR(pr.rawData.repository.owner.login, pr.rawData.repository.name, pr.prNumber, pr.user.githubUser!.githubAccessToken)
}
actionMerge.eventType = 'slack.action.merge'

module.exports = [actionMerge]
