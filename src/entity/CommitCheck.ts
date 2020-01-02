import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Commit } from '.';
import CustomEntity from './CustomEntity'
import { bigInt } from './util';

@Entity()
export default class CommitCheck extends CustomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint', { transformer: [bigInt], unique: true, nullable: true })
  githubId: number;

  @Column()
  name: string;

  @Column()
  status: 'pending' | 'success' | 'error' | 'failure'

  @Column('varchar', {nullable: true})
  description: string | null;

  @ManyToOne(type => Commit, commit => commit.checks)
  commit: Commit;

  @Column('varchar', {nullable: true})
  targetUrl: string | null;

  @Column()
  type: 'standard' | 'ci-circleci'

  @Column('jsonb', {nullable: true})
  rawData: any;
}
