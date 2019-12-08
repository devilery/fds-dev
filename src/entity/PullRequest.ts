import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany } from "typeorm";
import User from './User'
import Commit from './Commit';

@Entity()
export default class PullRequest extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  githubId: number;

  @Column()
  headSha: string;

  @Column()
  prNumber: number;

  @Column()
  slackThreadId: string;

  @Column()
  title: string;

  @ManyToOne(type => User, { nullable: true })
  user: User;

  @Column()
  websiteUrl: string;

  @ManyToMany(type => Commit, commit => commit.pullRequests)
  commits: Commit[]

  @Column('jsonb')
  rawData: any;

  @Column({default: 'github'})
  from: 'github';
}
