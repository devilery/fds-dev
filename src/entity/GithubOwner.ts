import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn, CreateDateColumn, OneToOne, UpdateDateColumn } from "typeorm";
import Team from './Team'
import Repository from './Repository'
import CustomEntity from "./CustomEntity";


@Entity()
export default class GithubOwner extends CustomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  login: string;

  @Column()
  githubAccessToken: string;

  @Column({ type: 'simple-array', default: '' })
  oldAcessTokens: string[];

  @Column({ unique: true })
  installationId: string;

  @Column('jsonb')
  githubAccessTokenRaw: any;

  @OneToOne(type => Team, team => team.githubOwner)
  team: Team;

  @OneToMany(type => Repository, repository => repository.owner)
  repositories: Repository[];
}

