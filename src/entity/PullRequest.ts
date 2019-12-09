import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany, ValueTransformer, OneToMany } from "typeorm";
import User from './User'
import Commit from './Commit';
import { bigInt } from './util';
import PullRequestReview from './PullRequestReview';


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

  @OneToMany(type => PullRequestReview, review => review.pullRequest)
  reviews: PullRequestReview[]

  @Column('jsonb')
  rawData: any;

  @Column({default: 'github'})
  from: 'github';
}
