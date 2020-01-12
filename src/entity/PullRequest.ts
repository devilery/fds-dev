import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany, ValueTransformer, OneToMany } from "typeorm";
import User from './User'
import Commit from './Commit';
import { bigInt } from './util';
import PullRequestReview from './PullRequestReview';
import { Repository, PullRequestReviewRequest, Pipeline } from '.'
import CustomEntity from './CustomEntity'
import { updatePrMessage } from "../libs/slack";
import ReviewInvite from "./ReviewInvite";

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

  @ManyToOne(type => User)
  user: User;

  @Column()
  websiteUrl: string;

  @ManyToMany(type => Commit, commit => commit.pullRequests)
  commits: Commit[]

  @OneToMany(type => PullRequestReview, review => review.pullRequest)
  reviews: PullRequestReview[]

  @OneToMany(type => PullRequestReviewRequest, reviewRequest => reviewRequest.pullRequest)
  reviewRequests: PullRequestReviewRequest;

  @OneToMany(type => ReviewInvite, invite => invite.pullRequest)
  invites: ReviewInvite[]

  @Column('jsonb')
  rawData: {raw_data: Webhooks.WebhookPayloadPullRequestPullRequest};

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

  async updateMainMessage() {
    if (this.state === 'closed' || this.state === 'merged') {
      console.log(`PR ${this.id} is closed or merged. Will not update main message`);
      return;
    }

    const headCommit = await this.getHeadCommit();
    const checks = await headCommit.relation('checks');
    await updatePrMessage(this, checks);
  }
}
