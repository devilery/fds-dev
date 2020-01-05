import { strict as assert } from 'assert'
import httpContext from 'express-http-context'
const { Base64 } = require('js-base64');

import { Commit, CommitCheck, PullRequest, User, Team, PullRequestReview, GithubUser, PullRequestReviewRequest, Repository, Pipeline } from '../entity';
import { ICommitCheck, IPullRequestEvent, IPullRequestReviewEvent, IPullRequestReviewRequest, IPullRequestReviewRequestRemove } from '../events/types';
import { ChatPostMessageResult } from '../libs/slack-api'

import { getPrMessage, IMessageData, getChecksSuccessMessage, getCheckErrorMessage, getReviewMessage, getReviewRequestNotification } from '../libs/slack-messages'
import { createOrUpdatePr, isHeadCommitCheck } from '../libs/pr';
import { updatePrMessage, sendPipelineNotifiation } from '../libs/slack'
import { updatePipeline, isCircleCheck } from '../libs/circleci'
const { sleep } = require('../libs/util');

const CI_SLEEP = typeof process.env.CI_SLEEP !== 'undefined' ? parseInt(process.env.CI_SLEEP, 10) : 7000;

const opened = async function (data: IPullRequestEvent) {
	const pr = await createOrUpdatePr(data)
	const client = pr.user.team.getSlackClient()

	const messageData = await getPrMessage(pr)

	// TODO: find correct check and pass it to updatePipeline; - prolly DEPRECATED
	const headCommit = await Commit.findOneOrFail({where: {sha: pr.headSha}});
	// const headCommit = await pr.getHeadCommit();
	// await updatePipeline(pr, headCommit,)

	const res = await client.chat.postMessage({text: messageData.text, blocks: messageData.blocks, channel: pr.user.slackImChannelId}) as ChatPostMessageResult
	pr.slackThreadId = res.message.ts
	await pr.save()
	await pr.reload()

	// TODO: remove redundant Slack API call
	// udpate with previously run checks as well
	const finalChecks = await CommitCheck.find({where: {commit: headCommit}})
	if (finalChecks && finalChecks.length > 0) {
		await updatePrMessage(pr, finalChecks)
	}
};

opened.eventType = 'pr.opened';

async function pullRequestClosed(reviewRequest: IPullRequestEvent) {
	const pr = await createOrUpdatePr(reviewRequest)
	const team = httpContext.get('team')
	console.log('pr closed/merged')
	console.log(reviewRequest.merged)

	const text = reviewRequest.merged ? '✅ PR has been merged' : '🗑 PR has been closed';
	// const repo = Repository.findOneOrFail({where: {githubId: reviewRequest.repository.id}})
	// const pr = await PullRequest.findOneOrFail({where: {githubId: reviewRequest.id}, relations: ['user']})
	assert(pr.user, 'PR doesnt have user relation')
	assert(pr.slackThreadId, 'PR does not have slack thread id')

	const client = team.getSlackClient()
	await client.chat.postMessage({ text, channel: pr.user.slackImChannelId, thread_ts: pr.slackThreadId, link_names: true })

	const messageData = await getPrMessage(pr)

	await client.chat.update({text: messageData.text, blocks: messageData.blocks, channel: pr.user.slackImChannelId, ts: pr.slackThreadId})
}

pullRequestClosed.eventType = 'pr.closed'

const commitCheckUpdate = async function (check: ICommitCheck) {
	// {
	//   status: 'success',
	//   type: 'standard',
	//   from: 'github',
	//   id: 8461715742,
	//   commit_sha: '89bc4f598f8628f12f540057ca8d45f5fe2224c2',
	//   name: 'ci/circleci: some-deployment',
	//   target_url: 'https://circleci.com/gh/devilery/fds-dev/873?utm_campaign=vcs-integration-link&utm_medium=referral&utm_source=github-build-link',
	//   context: 'ci/circleci: some-deployment',
	//   description: 'Your tests passed on CircleCI!',
	//   pull_request_id: 23,
	//   raw_data: {
	// console.log('check', check)
	let commit = await Commit.findOneOrFail({ where: { sha: check.commit_sha }, relations: ['checks'] })
	console.log('commit ID', commit.id, 'check', check.name, check.status)
	const pr = await PullRequest.findOneOrFail({ where: { id: check.pull_request_id }, relations: ['user', 'user.team', 'repository'] })
	const { user } = pr
	const { team } = user

	httpContext.set('pr', pr);

	// TODO: handle commit pipeline re-run (PR's pipelines status gets reset as new commits arrive)
	// TODO: maybe move circle logic to status webook handler??
	if (isCircleCheck(check)) {
		check.type = 'ci-circleci';

		await updatePipeline(pr, commit, check)

		// TODO:
		// check.ci_data = {
		// 	estimate_ms: circleCiData.estimate_ms,
		// 	jobs_on_hold: circleCiData.workflow.jobs_on_hold
		// }

	// if the check is not circle, let's ignore downloading pipelines and just debounce the final status check
	} else {

		// TODO: we are picking up the new set status value
		let dbCheck = await CommitCheck.findOne({ where: { commit, type: check.type, name: check.name }})

		// console.log(dbCheck.status, check.status)
		if (dbCheck) {
			// if changed to done then wait. This way other pending events can activate and entire check flow will not return done
			if (dbCheck.status === 'pending' && check.status === 'success') {
				await sleep(CI_SLEEP) // wait for other events to start if exists
			}

			if (dbCheck.status === check.status) {
				console.log('exiting function (status equals)')
				return;
			}

		} else {
			// TODO: compact layer for normal VS circle code path
			dbCheck = new CommitCheck()
		}

		// upsert info
		dbCheck.githubId = check.id;
		dbCheck.targetUrl = check.target_url;
		dbCheck.rawData = check

		dbCheck.name = check.name;
		dbCheck.status = check.status;
		dbCheck.type = check.type as any;
		dbCheck.commit = commit

		await dbCheck.save()
		await dbCheck.reload()
	}

	// TODO: backfill the check from the current webhook data


	let isHeadCommit = await isHeadCommitCheck(check.commit_sha, check.pull_request_id)

	if (!isHeadCommit) {
		return
	}

	// commit.reload does not reload relations
	const finalChecks = await CommitCheck.find({where: {commit}})

	await updatePrMessage(pr, finalChecks)

	// TODO: fails with circle approval jobs
	// if (check.status === 'pending' && check.target_url.includes('/workflow-run/') && check.description.includes('job is on hold'))
	const finalSingleCheck = await CommitCheck.findOne({ where: {commit, type: check.type, name: check.name}})

	if (!finalSingleCheck) {
		console.error('Final check was not found', check)
		return;
	}

	assert(finalSingleCheck, 'Final check was not found')

	await sendPipelineNotifiation(pr, finalChecks, finalSingleCheck)
}
commitCheckUpdate.eventType = 'pr.check.update'


const pullRequestReviewed = async function (reviewEvent: IPullRequestReviewEvent) {
	const pr = await PullRequest.findOneOrFail({ where: { id: reviewEvent.pull_request_id }, relations: ['user', 'user.team'] })
	const user = pr.user
	const team = user.team
	const client = team.getSlackClient()
	const ghReviewUser = await GithubUser.findOne({ where: { githubId: reviewEvent.user.github_id } })
	const reviewUser = await User.findOne({ where: { githubUser: ghReviewUser, team: team } })

	// check if any empty review request exists for this user. If so fill it with this review.
	// we use remote username as a key
	const reviewRequest = await PullRequestReviewRequest.findOne({ where: { reviewUsername: reviewEvent.user.github_login, pullRequest: pr, review: null } })

	const review = await PullRequestReview.create({
		remoteId: reviewEvent.remoteId,
		state: reviewEvent.state,
		websiteUrl: reviewEvent.website_url,
		rawData: reviewEvent.raw_data,
		reviewUsername: reviewEvent.user.github_login,
		reviewUser: reviewUser,
		reviewRequest: reviewRequest,
		pullRequest: pr
	})

	await review.save()

	let username = review.reviewUsername;

	if (reviewUser) {
		const slackUsername = await reviewUser.getSlackUsername();
		username = `@${slackUsername}`
	}

	await pr.updateMainMessage()

	const notification = getReviewMessage(review, username);
	client.chat.postMessage({ text: notification.text, channel: user.slackImChannelId, thread_ts: pr.slackThreadId ? pr.slackThreadId : undefined, link_names: true })
}

pullRequestReviewed.eventType = 'pr.reviewed'

const pullRequestReviewRequest = async function (reviewRequest: IPullRequestReviewRequest) {
	const pr = await PullRequest.findOneOrFail(reviewRequest.pull_request_id, { relations: ['user'] })
	let assigneeUser: User | undefined;
	if (reviewRequest.assignee_user_id) {
		assigneeUser = await User.findOne(reviewRequest.assignee_user_id, { relations: ['team'] })
	}

	// one user can have only one *EMPTY* (without finished review) request for PR. Delete the old ones in case of network or DB errors / bugs
	const oldRequests = await PullRequestReviewRequest.find({ where: { pullRequest: pr, reviewUsername: reviewRequest.review_username}, relations: ['review'] })
	for (let oldRequest of oldRequests.filter(item => item.review === null)) {
		await oldRequest.remove()
	}

	const request = await PullRequestReviewRequest.create({ pullRequest: pr, assigneeUser, reviewUsername: reviewRequest.review_username })
	await request.save()

	await pr.updateMainMessage()

	if (assigneeUser && !request.notified) {
		await request.reload()
		const requesterUsername = await pr.user.getSlackUsername()
		const notification = getReviewRequestNotification(request, requesterUsername, false)
		const client = assigneeUser.team.getSlackClient()
		await client.chat.postMessage({ text: notification.text, channel: assigneeUser.slackImChannelId, link_names: true })
		request.notified = true;
		await request.save()
	}
}

pullRequestReviewRequest.eventType = 'pr.review.request'

const pullRequestReviewRequestRemove = async function (reviewRequestRemove: IPullRequestReviewRequestRemove) {
	const pr = await PullRequest.findOneOrFail(reviewRequestRemove.pull_request_id, { relations: ['user'] })
	const request = await PullRequestReviewRequest.findOne({ where: { pullRequest: pr, reviewUsername: reviewRequestRemove.review_username }, relations: ['review'] })

	if (request && request.review === null) {
		request.remove();
	}

	await pr.updateMainMessage()
}

pullRequestReviewRequestRemove.eventType = 'pr.review.request.remove'

module.exports = [opened, commitCheckUpdate, pullRequestReviewed, pullRequestReviewRequest, pullRequestClosed, pullRequestReviewRequestRemove]
