import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn, OneToOne, JoinColumn } from "typeorm";
import User from './User'
import GithubOwner from './GithubOwner';
import { WebClient } from '@slack/web-api'
import CustomEntity from "./CustomEntity";


@Entity()
export default class Team extends CustomEntity {

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

  @Column('jsonb', {default: {}})
  featureFlags: {ci_checks?: boolean, merge_button?: boolean};

  getSlackClient(): WebClient {
    return new WebClient(this.slackBotAccessToken)
  }
}
