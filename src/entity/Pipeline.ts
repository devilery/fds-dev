import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, ManyToMany, ValueTransformer, OneToMany } from "typeorm";
import { CustomEntity, PullRequest } from '.'

@Entity()
export default class Pipeline extends CustomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => PullRequest, pr => pr.pipelines)
  pullRequest: PullRequest;

  @Column('jsonb')
  rawData: any;
}
