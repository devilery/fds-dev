import { BaseEntity, Entity, Column, PrimaryGeneratedColumn } from "typeorm";


@Entity()
class Team extends BaseEntity {

  @PrimaryGeneratedColumn()
  id;

  
}