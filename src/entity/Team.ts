import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import User from './User'
import GithubOwner from './GithubOwner';


@Entity()
export default class Team extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  githubConnected: boolean;

  @Column()
  slackId: string;

  @OneToMany(type => User, user => user.team)
  users: User[];

  @OneToMany(type => GithubOwner, githubOwner => githubOwner.team)
  githubOwner: GithubOwner[];
}