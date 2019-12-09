import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany, ValueTransformer } from "typeorm";
import { bigInt } from './util';
import PullRequest from "./PullRequest";

export type ReviewStateType = 'commented' | 'changes_requested' | 'approved';


@Entity()
export default class PullRequestReview extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint', { transformer: [bigInt], unique: true })
  remoteId: number;

  @ManyToOne(type => PullRequest, pr => pr.reviews)
  pullRequest: PullRequest;

  @Column()
  state: ReviewStateType

  @Column()
  websiteUrl: string;

  @Column()
  reviewUserName: string;

  @Column('jsonb')
  rawData: any;
}