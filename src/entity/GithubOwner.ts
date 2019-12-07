import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import Team from './Team'
import Repository from './Repository'

@Entity()
export default class GithubOwner extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  githubAccessToken: string;

  @Column()
  installationId: string;

  @Column('jsonb')
  githubAccessTokenRaw: any;

  @ManyToOne(type => Team, team => team.users)
  team: Team;

  @OneToMany(type => Repository, repository => repository.owner)
  repositories: Repository[];
}

