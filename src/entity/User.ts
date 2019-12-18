import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinTable, JoinColumn, OneToMany, ManyToMany } from "typeorm";
import { Repository, Team, GithubUser, PullRequestReviewRequest } from '.'
import { UsersInfoResult } from "../libs/slack-api";

@Entity()
export default class User extends BaseEntity {
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
  metadata: {reviewPR: number, prAuthor: GithubUser['id'], reviewRepo: Repository['id']};

  @OneToMany(type => PullRequestReviewRequest, request => request.assigneeUser)
  prReviewRequests: PullRequestReviewRequest[]

  async getSlackUsername() {
    if (!this.team) {
      this.team = await Team.findOneOrFail({ where: { users: { id: this.id } } })
    }

    const client = this.team.getSlackClient()
    const userInfo = await client.users.info({ user: this.slackId }) as UsersInfoResult;
    return userInfo.user.name
  }
}
