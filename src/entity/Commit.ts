import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, ManyToMany, JoinTable } from "typeorm";
import PullRequest from './PullRequest';
import CommitCheck from './CommitCheck';

@Entity()
export default class Commit extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  sha: string;

  @Column({ unique: true })
  websiteUrl: string;

  @ManyToMany(type => PullRequest, pullRequest => pullRequest.commits)
  @JoinTable()
  pullRequests: PullRequest[]

  @OneToMany(type => CommitCheck, commitCheck => commitCheck.commit)
  checks: CommitCheck[]

  @Column('jsonb', {nullable: true})
  rawData: {};
}