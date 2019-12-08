import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn } from "typeorm";
import Team from './Team'
import GithubUser from './GithubUser';

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
  team: Team;

  @OneToOne(type => GithubUser, githubUser => githubUser.user)
  @JoinColumn()
  githubUser: GithubUser | null;
}