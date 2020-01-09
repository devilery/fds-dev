import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinTable, JoinColumn, OneToMany, ManyToMany } from "typeorm";
import { Repository, Team, GithubUser, PullRequestReviewRequest, ReviewInvite } from '.'
import { UsersInfoResult } from "../libs/slack-api";
import CustomEntity from "./CustomEntity";

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

  @Column('jsonb', {default: {}})
  featureFlags: {ci_checks?: boolean, merge_button?: boolean};

  async getSlackUsername() {
    await this.reload('team')
    const client = this.team.getSlackClient()
    const userInfo = await client.users.info({ user: this.slackId }) as UsersInfoResult;
    return userInfo.user.name
  }
}
