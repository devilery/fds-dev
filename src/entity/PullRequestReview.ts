import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany, ValueTransformer, OneToMany } from "typeorm";
import { bigInt } from './util';
import PullRequest from "./PullRequest";
import User from "./User";

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

  @ManyToOne(type => User, { nullable: true })
  reviewUser: User | null;

  @Column('jsonb')
  rawData: any;
}