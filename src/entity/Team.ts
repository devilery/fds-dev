import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";
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

  @OneToMany(type => GithubOwner, githubOwner => githubOwner.team)
  githubOwner: GithubOwner[];

  getSlackClient(): WebClient {
    return new WebClient(this.slackBotAccessToken)
  }
}
