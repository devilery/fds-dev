import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne} from "typeorm";
import { bigInt } from './util';
import PullRequest from "./PullRequest";
import User from "./User";
import CustomEntity from "./CustomEntity";
import PullRequestReviewRequest from "./PullRequestReviewRequest";

export type ReviewStateType = 'commented' | 'changes_requested' | 'approved';


@Entity()
export default class PullRequestReview extends CustomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint', { transformer: [bigInt], unique: true })
  remoteId: number;

  @OneToOne(type => PullRequestReviewRequest, request => request.review, { nullable: true })
  @JoinColumn()
  reviewRequest: PullRequestReviewRequest | null;

  @ManyToOne(type => PullRequest, pr => pr.reviews)
  pullRequest: PullRequest;

  @Column()
  state: ReviewStateType

  @Column()
  websiteUrl: string;

  @Column()
  reviewUserName: string;

  @ManyToOne(type => User, { nullable: true })
  reviewUser: User | null;

  @Column('jsonb')
  rawData: any;
}