import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany, ValueTransformer, OneToMany, JoinTable } from "typeorm";
import User from "./User";
import PullRequest from "./PullRequest";
import { CustomEntity } from '.';

@Entity()
export default class PullRequestReviewRequest extends CustomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => User, user => user.prReviewRequests)
  assigneeUser: User

  @ManyToOne(type => PullRequest, pr => pr.reviewRequests)
  pullRequest: PullRequest
}