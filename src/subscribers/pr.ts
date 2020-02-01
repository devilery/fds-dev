import { PullRequest, User, PullRequestReview, GithubUser, PullRequestReviewRequest } from '../entity';
import { IPullRequestEvent, IPullRequestReviewEvent, IPullRequestReviewRequest, IPullRequestReviewRequestRemove, IReviewRequestNotification } from '../events/types';
import { ChatPostMessageResult } from '../libs/slack-api'

import { getPrMessage, getReviewMessage, getReviewRequestNotification } from '../libs/slack-messages'
import { createOrUpdatePr, rebuildPullRequest } from '../libs/pr';
import { sendChecksNotification } from '../libs/slack'
import { trackEvent } from '../libs/analytics'
import assert from '../libs/assert'

const opened = async function (data: IPullRequestEvent) {
	const pr = await createOrUpdatePr(data);
	const user = await pr.relation('user')
	const messageData = await getPrMessage(pr);

	// Create main PR message and store it's ts value so we can send messages to it's thread
	const botClient = pr.user.team.getSlackClient();
	const mainMsgRes = await botClient.chat.postMessage({text: messageData.text, blocks: messageData.blocks, channel: user.slackImChannelId}) as ChatPostMessageResult
	pr.slackThreadId = mainMsgRes.message.ts
	await pr.save()

	// HACK: Send a dummy message to the thread so a user will get nottifications for new messages in this thread
	const userClient = pr.user.getSlackClient();
	if (userClient) {
		const dummyMsgRes = await userClient.chat.postMessage({text: "🧐 I'm watching this thread...", channel: user.slackImChannelId, ts: pr.slackThreadId, as_user: true}) as ChatPostMessageResult
		setTimeout(() => {
			userClient.chat.delete({channel: user.slackImChannelId, ts: dummyMsgRes.message.ts})
		}, 1000);
	}

	// Rebuild the PR, this will emmit pr.rebuilded event and the message will get updated with latest data
	await rebuildPullRequest(pr.id);

	trackEvent('PR opened', {pr_id: pr.id})
};

opened.eventType = 'pr.opened';

async function pullRequestClosed(reviewRequest: IPullRequestEvent) {
	const pr = await createOrUpdatePr(reviewRequest)
	const user = await pr.relation('user')
	const team = await user.relation('team')
	const text = pr.state === 'merged' ? '✅ PR has been merged' : '🗑 PR has been closed';
	assert(pr.user, 'PR doesnt have user relation')
	assert(pr.slackThreadId, 'PR does not have slack thread id')

	const client = team.getSlackClient()
	await client.chat.postMessage({ text, channel: user.slackImChannelId, thread_ts: pr.slackThreadId, link_names: true })

	const messageData = await getPrMessage(pr)

	await client.chat.update({text: messageData.text, blocks: messageData.blocks, channel: user.slackImChannelId, ts: pr.slackThreadId})

	trackEvent(
		pr.state === 'merged' ? 'PR merged' : 'PR closed',
		{pr_id: pr.id}
	)
}

pullRequestClosed.eventType = 'pr.closed'

const prRebuilded = async function (data: { pr_id: number }) {
	const pr = await PullRequest.findOneOrFail(data.pr_id);
	await pr.updateMainMessage()
	await sendChecksNotification(pr);
}

prRebuilded.eventType = 'pr.rebuilded'
 
const pullRequestReviewed = async function (reviewEvent: IPullRequestReviewEvent) {
	const pr = await PullRequest.findOneOrFail({ where: { id: reviewEvent.pull_request_id }, relations: ['user', 'user.team'] })
	const user = pr.user
	const team = user.team
	const client = team.getSlackClient()
	const ghReviewUser = await GithubUser.findOne({ where: { githubId: reviewEvent.user.github_id } })
	const reviewUser = await User.findOne({ where: { githubUser: ghReviewUser, team: team } })

	// check if any empty review request exists for this user. If so fill it with this review.
	// we use remote username as a key
	const reviewRequests = await PullRequestReviewRequest.find({ where: { reviewUsername: reviewEvent.user.github_login, pullRequest: pr }, order: { id: 'DESC' } })

	const review = await PullRequestReview.create({
		remoteId: reviewEvent.remoteId,
		state: reviewEvent.state,
		websiteUrl: reviewEvent.website_url,
		rawData: reviewEvent.raw_data,
		reviewUsername: reviewEvent.user.github_login,
		reviewUser: reviewUser,
		reviewRequest: reviewRequests[0],
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

	trackEvent('PR reviewed', {pr_id: pr.id})
}

pullRequestReviewed.eventType = 'pr.reviewed'

const pullRequestReviewRequest = async function (reviewRequest: IPullRequestReviewRequest) {
	let assigneeUser: User | null = null;
	if (reviewRequest.assignee_user_id) {
		assigneeUser = await User.findOneOrFail(reviewRequest.assignee_user_id, { relations: ['team'] })
	}

	const pr = await PullRequest.findOneOrFail(reviewRequest.pull_request_id, { relations: ['user'] })
	const requests = await PullRequestReviewRequest.find({ where: { pullRequest: pr, assigneeUser, reviewUsername: reviewRequest.review_username }, order: { id: 'ASC' }, relations: ['reviews'] })
	const noReviews = requests.filter(item => item.reviews.length === 0)
	let request = noReviews.pop();

	// one user can have only one *EMPTY* (without finished review) request for PR. Delete the old ones in case of network or DB errors / bugs
	for (let requestNoReview of noReviews) {
		await requestNoReview.remove()
	}

	if (!request) {
		request = await PullRequestReviewRequest.create({ pullRequest: pr, assigneeUser, reviewUsername: reviewRequest.review_username })
		await request.save();
	}
 
	await pr.updateMainMessage()

	if (assigneeUser && !request.notified) {
		await request.reload()
		const requesterUsername = await pr.user.getSlackUsername()
		const notification = getReviewRequestNotification(pr.websiteUrl, pr.prNumber, pr.title, requesterUsername)
		const client = assigneeUser.team.getSlackClient()
		await client.chat.postMessage({ text: notification.text, blocks: notification.blocks, channel: assigneeUser.slackImChannelId, link_names: true })
		request.notified = true;
		await request.save()
	}
}

pullRequestReviewRequest.eventType = 'pr.review.request'

const reviewRequestNotification = async function (notificationEvent: IReviewRequestNotification) {
	const assigneeUser = await User.findOneOrFail(notificationEvent.assignee_user_id, { relations: ['team'] })
	const notification = getReviewRequestNotification(notificationEvent.pr_link, notificationEvent.pr_number, notificationEvent.title, notificationEvent.requester_username)
	const client = assigneeUser.team.getSlackClient()
	await client.chat.postMessage({ text: notification.text, blocks: notification.blocks, channel: assigneeUser.slackImChannelId, link_names: true })
}

reviewRequestNotification.eventType = 'review.request.notification'

const pullRequestReviewRequestRemove = async function (reviewRequestRemove: IPullRequestReviewRequestRemove) {
	const pr = await PullRequest.findOneOrFail(reviewRequestRemove.pull_request_id, { relations: ['user'] })
	const requests = await PullRequestReviewRequest.find({ where: { pullRequest: pr, reviewUsername: reviewRequestRemove.review_username }, relations: ['reviews'] })

	for (let request of requests) {
		if (request.reviews.length === 0) {
			await request.remove();
		}
	}

	await pr.updateMainMessage()
}

pullRequestReviewRequestRemove.eventType = 'pr.review.request.remove'

module.exports = [opened, pullRequestReviewed, pullRequestReviewRequest, pullRequestClosed, pullRequestReviewRequestRemove, prRebuilded]
