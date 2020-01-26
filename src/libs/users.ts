// @ts-ignore
import assert from './assert';

import { Team, User } from '../entity';
import { emmit } from './event.js';
import { UsersInfoResult, ImOpenResult } from './slack-api';
import { updateUser } from './analytics'

export async function createUser(userSlackId: string, team: Team, slackUserToken: string | null, metadata: any | null = null, sendEvent = true): Promise<User> {
	const client = team.getSlackClient();
	
	// Opetn IM channel between the user and HappyShip bot user 
	const imInfo = await client.im.open({user: userSlackId}) as ImOpenResult
	assert(imInfo.ok, 'Im open failed!')

	const userInfo = await client.users.info({user: userSlackId}) as UsersInfoResult

	const user = User.create({
		slackId: userInfo.user.id,
		slackFullName: userInfo.user.real_name,
		team: team,
		slackImChannelId: imInfo.channel.id
	})

	if (metadata)
		user.metadata = metadata;

	await user.save()
	await user.reload()

	const userProps = {};
	if (userInfo.user.profile.phone) {
		userProps['$phone'] = userInfo.user.profile.phone;
	}
	if (userInfo.user.tz) {
		userProps['$timezone'] = userInfo.user.tz
	}
	if (userInfo.user.profile.email) {
		userProps['$email'] = userInfo.user.profile.email;
	}
	updateUser(user.id, {
		$name: user.slackFullName,
		$created: user.createdAt.toISOString(),
		...userProps,
		team_id: team.id,
	})

	if (sendEvent) {
		emmit('user.created', user)
	}

	return user
}
