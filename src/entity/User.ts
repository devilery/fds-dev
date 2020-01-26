import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinTable, JoinColumn, OneToMany, ManyToMany } from "typeorm";
import mixpanel from 'mixpanel'

import { Repository, Team, GithubUser, PullRequestReviewRequest, ReviewInvite } from '.'
import { UsersInfoResult } from "../libs/slack-api";
import * as analytics from '../libs/analytics'
import CustomEntity from './CustomEntity'
import { WebClient } from '@slack/web-api';
import { IFeatureFlags } from '../libs/featureFlasg';

@Entity()
export default class User extends CustomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  slackId: string;

  // Slack username can be changed, if you want to be sure
  // it's up-to-date use getSlackUsername method instead
  // e.g. when marking (@marek-vybiral) a user in slack message
  @Column({nullable: true})
  slackUsernameCached: string;

  @Column({nullable: true})
  slackUserToken: string;

  @Column()
  slackFullName: string;

  @Column()
  slackImChannelId: string;

  @ManyToOne(type => Team, team => team.users)
  @JoinColumn()
  team: Team;

  @ManyToOne(type => GithubUser, githubUser => githubUser.users, { nullable: true })
  githubUser: GithubUser | null;

  @Column('jsonb', {nullable:true})
  metadata: {reviewPR: number, prAuthor: GithubUser['id'], reviewRepo: Repository['id']} | null;

  @OneToMany(type => ReviewInvite, invite => invite.user)
  reviewInvites: ReviewInvite[]

  @OneToMany(type => PullRequestReviewRequest, request => request.assigneeUser)
  prReviewRequests: PullRequestReviewRequest[]

  @Column('jsonb', {})
  featureFlags: IFeatureFlags;

  async getSlackUsername() {
    await this.reload('team')
    const client = this.team.getSlackClient()
    const userInfo = await client.users.info({ user: this.slackId }) as UsersInfoResult;

    this.slackUsernameCached = userInfo.user.name
    await this.save()

    return this.slackUsernameCached
  }

  getSlackClient(): WebClient | null {
    if (this.slackUserToken) {
      return new WebClient();
    }
    return null;
  }

  trackEvent(eventName: string, props: mixpanel.PropertyDict = {}): void {
    analytics.trackEvent(eventName, {distinct_id: ''+this.id, ...props})
  }
}
