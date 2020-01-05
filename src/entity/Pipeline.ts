import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany, ValueTransformer, OneToMany } from "typeorm";
import { CustomEntity, PullRequest } from '.'

@Entity()
export default class Pipeline extends CustomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: false})
  url: string;

  // TODO: maybe not unique ?
  @Column({ unique: true })
  sha: string;

  @ManyToOne(type => PullRequest, pr => pr.pipelines)
  pullRequest: PullRequest;

  @Column('jsonb')
  rawData: any;
}
