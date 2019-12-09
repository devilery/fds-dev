import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn } from "typeorm";
import Team from './Team'
import GithubUser from './GithubUser';
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

  @OneToOne(type => GithubUser, githubUser => githubUser.user, { nullable: true })
  @JoinColumn()
  githubUser: GithubUser | null;

  @Column('jsonb', {nullable:true})
  metadata: {reviewPR: number, prAuthor: GithubUser['id']};

  async getSlackUsername() {
    if (!this.team) {
      this.team = await Team.findOneOrFail({ where: { users: { id: this.id } } })
    }

    const client = this.team.getSlackClient()
    const userInfo = await client.users.info({ user: this.slackId }) as UsersInfoResult;
    return userInfo.user.name
  }
}
