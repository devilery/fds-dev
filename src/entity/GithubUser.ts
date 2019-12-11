import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne } from 'typeorm';
import User from './User';
import { bigInt } from './util';

@Entity()
export default class GithubUser extends BaseEntity {

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

  @OneToMany(type => User, user => user.githubUser)
  users: User[]
}
