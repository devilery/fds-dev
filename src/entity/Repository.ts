import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from "typeorm";
import GithubOwner from './GithubOwner'
import { bigInt } from './util';
import { PullRequest } from '.'

@Entity()
export default class Repository extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({default: 'Repo'})
  name: string;

  @Column('bigint', { transformer: [bigInt], unique: true })
  githubId: number;

  @ManyToOne(type => GithubOwner, owner => owner.repositories)
  owner: GithubOwner;

  @Column({ type: 'jsonb' })
  rawData: any;

  @OneToMany(type => PullRequest, pr => pr.repository)
  pullRequests: PullRequest[];
}
