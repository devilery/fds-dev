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
  status: 'pending' | 'in_progress' | 'waiting_for_manual_action' | 'success' | 'failure'

  @Column('varchar', {nullable: true})
  description: string | null;

  @ManyToOne(type => Commit, commit => commit.checks)
  commit: Commit;

  @Column('varchar', {nullable: true})
  targetUrl: string | null;

  @Column()
  type: 'standard' | 'ci-circleci' | 'check'

  @Column('jsonb', {nullable: true})
  rawData: any;

  static async updateOrCreate(attributes: {}, updateAttributes: Partial<CommitCheck>): Promise<CommitCheck> {
    let created;
    const result = await CommitCheck.update(attributes, updateAttributes)

    if (!result || typeof result.affected === 'undefined' || result.affected < 1){
      created = this.create({...attributes, ...updateAttributes})
      await created.save();
    }

    return await CommitCheck.findOneOrFail({where: attributes})
  }
}
