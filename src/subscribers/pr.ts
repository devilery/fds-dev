import { strict as assert } from 'assert'
import httpContext from 'express-http-context'
import { Commit, CommitCheck, PullRequest, User, Team, PullRequestReview, GithubUser, PullRequestReviewRequest, Repository } from '../entity';
import { ICommitCheck, IPullRequestEvent, IPullRequestReviewEvent, IPullRequestReviewRequest } from '../events/types';
import { ChatPostMessageResult } from '../libs/slack-api'

import { getPrMessage, IMessageData, getChecksSuccessMessage, getCheckErrorMessage, getReviewMessage, getReviewRequestNotification } from '../libs/slack-messages'
import { createOrUpdatePr, isHeadCommitCheck } from '../libs/pr';
const { jobDetails } = require('../libs/circleci');
const { sleep } = require('../libs/util');
var Base64 = require('js-base64').Base64;

const opened = async function (data: IPullRequestEvent) {
	const pr = await createOrUpdatePr(data)
	const client = pr.user.team.getSlackClient()

	const messageData = getPrMessage(pr)

	const res = await client.chat.postMessage({text: messageData.text, blocks: messageData.blocks, channel: pr.user.slackImChannelId}) as ChatPostMessageResult
	pr.slackThreadId = res.message.ts
	await pr.save()
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

	const messageData = getPrMessage(pr)

	await client.chat.update({text: messageData.text, blocks: messageData.blocks, channel: pr.user.slackImChannelId, ts: pr.slackThreadId})
}

pullRequestClosed.eventType = 'pr.closed'

const commitCheckUpdate = async function (check: ICommitCheck) {
	let commit = await Commit.findOneOrFail({ where: { sha: check.commit_sha }, relations: ['checks'] })
	const pr = await PullRequest.findOneOrFail({ where: { id: check.pull_request_id }, relations: ['user', 'user.team'] })
	const user = pr.user
	const team = user.team

	if (check.context && check.context.includes('ci/circleci')) {
		let ci_data = {};

		if (team.circlePersonalToken) {
			let circleCiData = await jobDetails({ jobUrl: check.target_url, token: team.circlePersonalToken })
			ci_data = {
				estimate_ms: circleCiData.estimate_ms,
				jobs_on_hold: circleCiData.workflow.jobs_on_hold
			}
		}

		Object.assign(check, {
			type: 'ci-circleci',
			ci_data: ci_data
		})
	}

	let dbCheck = await CommitCheck.findOne({ where: { name: check.name, commit: { id: commit.id } } })

	// if changed to done then wait 7 seconds. This way other pending events can activate and entire check flow will not return done
	if (dbCheck && dbCheck.status === 'pending' && check.status === 'success') {
		await sleep(7000) // wait 7 seconds for other events to start if exists
	}


	if (dbCheck && dbCheck.status === check.status) {
		return;
	}

	if (!dbCheck) {
		dbCheck = new CommitCheck()
	}

	dbCheck.githubId = check.id;
	dbCheck.name = check.name;
	dbCheck.status = check.status;
	dbCheck.targetUrl = check.target_url;
	dbCheck.type = check.type as any;
	dbCheck.rawData = check
	dbCheck.commit = commit

	await dbCheck.save()
	await dbCheck.reload()
	commit = await Commit.findOneOrFail({ where: { sha: check.commit_sha }, relations: ['checks'] })
	const checks = commit.checks

	let isHeadCommit = await isHeadCommitCheck(check.commit_sha, check.pull_request_id)

	if (!isHeadCommit) {
		return
	}

	const client = pr.user.team.getSlackClient()
	const messageData = getPrMessage(pr, checks)
	if (!pr.slackThreadId) {
		console.error('je to v pici')
		return
	}
	await client.chat.update({text: messageData.text, blocks: messageData.blocks, channel: pr.user.slackImChannelId, ts: pr.slackThreadId})

	let allChecksPassed = checks.every(check => check.status === 'success')

	var checkMessage: IMessageData | null  = null
	if (allChecksPassed)
		checkMessage = getChecksSuccessMessage(checks)
	if (check.status === 'failure' || check.status === 'error')
		checkMessage = getCheckErrorMessage(dbCheck)

	if (checkMessage)
		client.chat.postMessage({text: checkMessage.text, blocks: checkMessage.blocks, channel: pr.user.slackImChannelId, thread_ts: pr.slackThreadId, link_names: true})

}
commitCheckUpdate.eventType = 'pr.check.update'


const pullRequestReviewed = async function (reviewEvent: IPullRequestReviewEvent) {
	const pr = await PullRequest.findOneOrFail({ where: { id: reviewEvent.pull_request_id }, relations: ['user', 'user.team'] })
	const user = pr.user
	const team = user.team
	const client = team.getSlackClient()
	const ghReviewUser = await GithubUser.findOne({ where: { githubId: reviewEvent.user.github_id } })
	const reviewUser = await User.findOne({ where: { githubUser: ghReviewUser, team: team } })

	const review = await PullRequestReview.create({
		remoteId: reviewEvent.remoteId,
		state: reviewEvent.state,
		websiteUrl: reviewEvent.website_url,
		rawData: reviewEvent.raw_data,
		reviewUserName: reviewEvent.user.github_login,
		reviewUser: reviewUser,
		pullRequest: pr
	})

	await review.save()

	let username = review.reviewUserName;

	if (reviewUser) {
		const slackUsername = await reviewUser.getSlackUsername();
		username = `@${slackUsername}`
	}

	const notification = getReviewMessage(review, username);

	client.chat.postMessage({ text: notification.text, channel: user.slackImChannelId, thread_ts: pr.slackThreadId ? pr.slackThreadId : undefined, link_names: true })
}

pullRequestReviewed.eventType = 'pr.reviewed'

const pullRequestReviewRequest = async function (reviewRequest: IPullRequestReviewRequest) {
	const pr = await PullRequest.findOneOrFail(reviewRequest.pull_request_id, { relations: ['user'] })
	const assigneeUser = await User.findOneOrFail(reviewRequest.assignee_user_id, { relations: ['team'] })
	const client = assigneeUser.team.getSlackClient()

	let existing = true;
	let request = await PullRequestReviewRequest.findOne({ where: { pullRequest: pr, assigneeUser }, relations: ['pullRequest'] })

	if (!request) {
		existing = false;
		request = await PullRequestReviewRequest.create({ pullRequest: pr, assigneeUser })
	}

	await request.reload()

	const requesterUsername = await pr.user.getSlackUsername()
	const notification = getReviewRequestNotification(request, requesterUsername, existing)

	await client.chat.postMessage({ text: notification.text, channel: assigneeUser.slackImChannelId, link_names: true })
}

pullRequestReviewRequest.eventType = 'pr.review.request'

module.exports = [opened, commitCheckUpdate, pullRequestReviewed, pullRequestReviewRequest, pullRequestClosed]
