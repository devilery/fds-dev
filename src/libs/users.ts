// @ts-ignore
import { strict as assert } from 'assert';
import { WebClient } from '@slack/web-api'

import { emmit } from '../libs/event.js'
import { Team, User } from '../entity'
import { UsersInfoResult, ImOpenResult } from '../libs/slack-api'

export async function createUser(userSlackId: string, team: Team, metadata: User['metadata'] | null = null) {
	const client = team.getSlackClient();
	const userInfo = await client.users.info({user: userSlackId}) as UsersInfoResult
	const imInfo = await client.im.open({user: userSlackId}) as ImOpenResult
	assert(imInfo.ok, 'Im open failed!')

	const user = User.create({
		slackId: userInfo.user.id,
		name: userInfo.user.real_name,
		team: team,
		slackImChannelId: imInfo.channel.id
	})

	if (metadata)
		user.metadata = metadata;

	await user.save()
	await user.reload()
	emmit('user.created', user)
}
