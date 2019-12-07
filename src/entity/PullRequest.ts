import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";

export default class PullRequest extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({default: 'github'})
  from: 'github';

  
}