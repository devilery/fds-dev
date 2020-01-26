import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn, OneToOne, JoinColumn } from "typeorm";
import User from './User'
import GithubOwner from './GithubOwner';
import { WebClient } from '@slack/web-api'
import CustomEntity from "./CustomEntity";
import { IFeatureFlags } from '../libs/featureFlasg';


@Entity()
export default class Team extends CustomEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({default: false})
  githubConnected: boolean;

  @Column()
  slackId: string;

  @Column({nullable: true})
  slackName: string;

  @Column({nullable: true})
  slackDomain: string;

  @Column()
  slackBotAccessToken: string;

  @Column({nullable: true})
  circlePersonalToken: string;

  @OneToMany(type => User, user => user.team)
  users: User[];

  @OneToOne(type => GithubOwner, githubOwner => githubOwner.team, { nullable: true })
  @JoinColumn()
  githubOwner: GithubOwner | null;

  @Column('jsonb', {default: {ci_checks: true, ci_checks_notifications: true}})
  featureFlags: IFeatureFlags;

  getSlackClient(): WebClient {
    return new WebClient(this.slackBotAccessToken)
  }
}
