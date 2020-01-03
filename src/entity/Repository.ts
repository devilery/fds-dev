import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from "typeorm";
import GithubOwner from './GithubOwner'
import { bigInt } from './util';
import { PullRequest } from '.'
import CustomEntity from "./CustomEntity";

@Entity()
export default class Repository extends CustomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({default: 'Repo'})
  name: string;

  @Column('bigint', { transformer: [bigInt], unique: true })
  githubId: number;

  @ManyToOne(type => GithubOwner, owner => owner.repositories)
  owner: GithubOwner;

  @Column()
  websiteUrl: string;

  @Column({ type: 'jsonb' })
  rawData: any;

  @OneToMany(type => PullRequest, pr => pr.repository)
  pullRequests: PullRequest[];
}
