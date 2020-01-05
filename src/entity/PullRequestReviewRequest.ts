import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany, ValueTransformer, OneToMany, JoinTable, OneToOne } from "typeorm";
import User from "./User";
import PullRequest from "./PullRequest";
import CustomEntity from "./CustomEntity";
import PullRequestReview from "./PullRequestReview";

@Entity()
export default class PullRequestReviewRequest extends CustomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => User, user => user.prReviewRequests, { nullable: true })
  assigneeUser: User | null

  @Column()
  reviewUsername: string;

  @OneToMany(type => PullRequestReview, review => review.reviewRequest)
  reviews: PullRequestReview[];

  @Column({default: false})
  notified: boolean;

  @ManyToOne(type => PullRequest, pr => pr.reviewRequests)
  pullRequest: PullRequest
}