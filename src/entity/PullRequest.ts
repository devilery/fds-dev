import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany, ValueTransformer, OneToMany } from "typeorm";
import User from './User'
import Commit from './Commit';
import { bigInt } from './util';
import PullRequestReview from './PullRequestReview';
import { Repository, PullRequestReviewRequest, Pipeline } from '.'
import CustomEntity from './CustomEntity'

@Entity()
export default class PullRequest extends CustomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint', { transformer: [bigInt], unique: true })
  githubId: number;

  @Column()
  headSha: string;

  @Column()
  prNumber: number;

  @Column()
  state: "open" | "closed" | "merged";

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

  @OneToMany(type => PullRequestReviewRequest, reviewRequest => reviewRequest.pullRequest)
  reviewRequests: PullRequestReviewRequest;

  @Column('jsonb')
  rawData: any;

  @Column({default: 'github'})
  from: 'github';

  @ManyToOne(type => Repository, repo => repo.pullRequests)
  repository: Repository;

  @OneToMany(type => Pipeline, p => p.pullRequest)
  pipelines: Pipeline[];

  async getHeadCommit() {
    return Commit.findOneOrFail({where: {sha: this.headSha}});
  }

  async getHeadPipeline() {
    return Pipeline.findOne({where: {pullRequest: this, sha: this.headSha}});
  }
}
