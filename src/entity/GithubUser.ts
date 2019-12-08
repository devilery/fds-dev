import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne } from 'typeorm';
import User from './User';
import { bigInt } from './util';

@Entity()
export default class GithubUser extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint', { transformer: [bigInt] })
  githubId: number;

  @Column()
  githubUsername: string;

  @Column()
  githubAccessToken: string;

  @Column('jsonb')
  rawGithubUserData: any;

  @OneToOne(type => User, user => user.githubUser)
  user: User
}
