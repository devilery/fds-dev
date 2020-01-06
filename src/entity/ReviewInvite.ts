import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinTable, JoinColumn, OneToMany, ManyToMany, OneToOne } from "typeorm";
import { User, PullRequest } from '.'
import CustomEntity from "./CustomEntity";

@Entity()
export default class ReviewInvite extends CustomEntity { 
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => User, user => user.reviewInvites)
  user: User;

  @ManyToOne(type => PullRequest, pr => pr.invites)
  pullRequest: PullRequest;
}