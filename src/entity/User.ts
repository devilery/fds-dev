import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinTable, JoinColumn, OneToMany, ManyToMany } from "typeorm";
import mixpanel from 'mixpanel'

import { Repository, Team, GithubUser, PullRequestReviewRequest, ReviewInvite } from '.'
import { UsersInfoResult } from "../libs/slack-api";
import * as analytics from '../libs/analytics'
import CustomEntity from './CustomEntity'

@Entity()
export default class User extends CustomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  slackId: string;

  @Column()
  name: string;

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

  @Column('jsonb', {default: {ci_checks: true}})
  featureFlags: {ci_checks?: boolean, merge_button?: boolean};

  async getSlackUsername() {
    await this.reload('team')
    const client = this.team.getSlackClient()
    const userInfo = await client.users.info({ user: this.slackId }) as UsersInfoResult;
    return userInfo.user.name
  }

  trackEvent(eventName: string, props: mixpanel.PropertyDict = {}): void {
    analytics.trackEvent(eventName, {distinct_id: ''+this.id, ...props})
  }
}
