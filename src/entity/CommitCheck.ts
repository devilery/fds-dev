import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import Commit from './Commit';

@Entity()
export default class CommitCheck extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint')
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

  @Column('jsonb')
  rawData: any;
}