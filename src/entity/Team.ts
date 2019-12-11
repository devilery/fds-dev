import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn, OneToOne, JoinColumn } from "typeorm";
import User from './User'
import GithubOwner from './GithubOwner';
import { WebClient } from '@slack/web-api'


@Entity()
export default class Team extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({default: false})
  githubConnected: boolean;

  @Column()
  slackId: string;

  @Column()
  slackBotAccessToken: string;

  @Column({nullable: true})
  circlePersonalToken: string;

  @OneToMany(type => User, user => user.team)
  users: User[];

  @OneToOne(type => GithubOwner, githubOwner => githubOwner.team, { nullable: true })
  @JoinColumn()
  githubOwner: GithubOwner | null;

  getSlackClient(): WebClient {
    return new WebClient(this.slackBotAccessToken)
  }
}
