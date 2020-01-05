// @ts-ignore
import { strict as assert } from 'assert';
import { Team, PullRequest, User } from '../entity'
import { mergePR, requestPullRequestReview } from '../libs/github-api'
import { requestSlackUsersToReview } from '../libs/github'
import { IPullRequestReviewRequest } from '../events/types';
import { emmit } from '../libs/event';


const actionMerge = async function(data: {pr_id: number, team: Team}) {
	console.log('event action Merge', data);
	console.log('Merge PR number', data['pr_id']);
	const pr = await PullRequest.findOneOrFail(data.pr_id, { relations:['user', 'user.githubUser'] });
	// const user = await User.findOneOrFail(pr.user.id, {relations:['githubUser']});
	console.log(pr.user.githubUser);
	assert(pr.user.githubUser, 'Github User for PR not found')
	mergePR(pr.rawData.repository.owner.login, pr.rawData.repository.name, pr.prNumber, pr.user.githubUser!.githubAccessToken)
}
actionMerge.eventType = 'slack.action.merge'

const actionReviewAssign = async function (data: { pr_id: number, team: Team, eventData: { selected_user: string }}) { 
	const team = data.team
	await team.reload()
	const pr = await PullRequest.findOneOrFail(data.pr_id, { relations: ['user', 'user.githubUser'] })
	const user = pr.user;

	if (!user.githubUser) {
		console.log('Author does not have github user')
		return;
	}

	requestSlackUsersToReview(
		[data.eventData.selected_user],
		pr.prNumber,
		user
	)
}

actionReviewAssign.eventType = 'slack.action.review_assign'

const activeReviewReassign = async function (data: { pr_id: number, team: Team, user: string}) {
	const team = data.team
	await team.reload()
	const pr = await PullRequest.findOneOrFail(data.pr_id, { relations: ['user', 'user.githubUser', 'repository', 'repository.owner'] })
	const user = pr.user;
	const repo = pr.repository;

	await requestPullRequestReview(repo.owner.login, repo.name, pr.prNumber, { reviewers: [data.user] }, user.githubUser!.githubAccessToken)

	const assigneUser = await User.findOne({ where: { githubUser: { githubUsername: data.user }, team: team } })

	if (assigneUser) {
		let reviewRequest: IPullRequestReviewRequest = {
			pull_request_id: pr.id,
			assignee_user_id: user.id,
			review_username: data.user
		}

		emmit('pr.review.request', reviewRequest)
	}
}

activeReviewReassign.eventType = 'slack.action.review_reassign'

module.exports = [actionMerge, actionReviewAssign, activeReviewReassign]
