import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import Commit from './Commit';

@Entity()
export default class CommitCheck extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  githubId: number;

  @Column()
  name: string;

  @Column()
  status: 'pending' | 'success' | 'error' | 'failure'

  @Column({nullable: true})
  description: string;

  @ManyToOne(type => Commit, commit => commit.checks)
  commit: Commit;

  @Column()
  targetUrl: string;

  @Column()
  type: 'standard' | 'ci-circleci'

  @Column('jsonb')
  rawData: any;
}