import {WebAPICallResult} from '@slack/web-api'


// https://api.slack.com/methods/oauth.access
export interface OauthAccessResult extends WebAPICallResult {
	user_id: string
	access_token: string
	bot: {
		bot_access_token: string
	}
}

// https://api.slack.com/methods/users.info
export interface UsersInfoResult extends WebAPICallResult {
	user: {
		id: string
		real_name: string
	}
}

// https://api.slack.com/methods/team.info
export interface TeamInfoResult extends WebAPICallResult {
	team: {
		id: string
		name: string
	}
}

// https://api.slack.com/methods/im.open
export interface ImOpenResult extends WebAPICallResult {
	channel: {
		id: string
	}
}

// https://api.slack.com/methods/chat.postMessage
export interface ChatPostMessageResult extends WebAPICallResult {
	message: {
		ts: string
	}
}

// https://api.slack.com/methods/chat.update
export interface ChatUpdateMessageResult extends WebAPICallResult {
	message: {
		ts: string
	}
}
