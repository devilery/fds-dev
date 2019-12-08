import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany, ValueTransformer } from "typeorm";
import User from './User'
import Commit from './Commit';
import { bigInt } from './util';


@Entity()
export default class PullRequest extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint', { transformer: [bigInt], unique: true })
  githubId: number;

  @Column()
  headSha: string;

  @Column()
  prNumber: number;

  @Column('varchar', { nullable: true })
  slackThreadId: string | null;

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
