import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import Team from './Team'


@Entity()
export default class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  slackId: string;

  @Column()
  name: string;

  @Column()
  slackImChannelId: string;

  @ManyToOne(type => Team, team => team.users)
  team: Team;
}