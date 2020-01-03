import { BaseEntity, CreateDateColumn, UpdateDateColumn, ObjectType, FindConditions, DeepPartial } from "typeorm";

type KeysOfType<T, TProp> = { [P in keyof T]: T[P] extends TProp ? P : never }[keyof T];
type GenericModel = CustomEntity | CustomEntity[] | undefined | null

export default class CustomEntity extends BaseEntity {
  @CreateDateColumn({ type: "timestamp", default: () => "timezone('utc', now())" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "timezone('utc', now())", onUpdate: "timezone('utc', now())" })
  updatedAt: Date;

  static async findOrCreate<T extends BaseEntity>(this: ObjectType<T>, attributes: FindConditions<T>, createWithAttributes: DeepPartial<T>): Promise<[T, boolean]> {
    const repository = (this as any).getRepository()

    const model = await repository.findOne({where: attributes})

    if (!model) {
      const create = repository.create({...attributes, ...createWithAttributes})
    	await create.save()

    	return [create, true];
    }

    return [model, false];
  }

  // TODO: Add lazy cache
  async relation<T extends KeysOfType<this, GenericModel>>(...relations: T[]): Promise<void> {
    let constructor = this.constructor as any;
    let instance = await constructor.findOneOrFail((this as any).id, { relations: [...relations] })

    for (let relation of relations) {
      this[relation] = instance[relation];
    }
    
    return Promise.resolve()
  }

  async reload<T extends KeysOfType<this, GenericModel>>(...relations: T[]) {

    let relationFetches = relations.map(async (item) => {
      await this.relation(item)
    })

    await Promise.all(relationFetches)
    await super.reload();
  }
}





