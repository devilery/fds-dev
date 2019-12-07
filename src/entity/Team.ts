import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import User from './User'
import GithubOwner from './GithubOwner';


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

  @OneToMany(type => User, user => user.team)
  users: User[];

  @OneToMany(type => GithubOwner, githubOwner => githubOwner.team)
  githubOwner: GithubOwner[];
}