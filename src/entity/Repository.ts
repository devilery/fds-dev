import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import GithubOwner from './GithubOwner'
import { bigInt } from './util';

@Entity()
export default class Repository extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint', { transformer: [bigInt], unique: true })
  githubId: number;

  @Column({ type: 'jsonb' })
  rawData: any;

  @ManyToOne(type => GithubOwner, team => team.repositories)
  owner: GithubOwner;
}