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

  @Column({ type: 'jsonb' })
  rawData: any;

  @ManyToOne(type => GithubOwner, team => team.repositories)
  owner: GithubOwner;

  @OneToMany(type => PullRequest, pr => pr.repository)
  pullRequests: PullRequest[];
}
