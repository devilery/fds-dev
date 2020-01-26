import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne } from 'typeorm';
import { User } from '.';
import { bigInt } from './util';
import CustomEntity from "./CustomEntity";


@Entity()
export default class GithubUser extends CustomEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint', { transformer: [bigInt], unique: true })
  githubId: number;

  @Column()
  githubUsername: string;

  @Column()
  githubAccessToken: string;

  @Column('jsonb')
  rawGithubUserData: any;

  // One GithubUser can be in multiple teams! (e.g. lezuse belongs to Productboard and to HappyShip teams)
  @OneToMany(type => User, user => user.githubUser)
  users: User[]
}
