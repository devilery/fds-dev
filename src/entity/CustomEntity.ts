import { BaseEntity, CreateDateColumn, UpdateDateColumn, ObjectType, FindConditions, DeepPartial } from "typeorm";

type KeysOfType<T, TProp> = { [P in keyof T]: T[P] extends TProp ? P : never }[keyof T];

export default class CustomEntity extends BaseEntity {
  @CreateDateColumn({ type: "timestamp", default: () => "timezone('utc', now())" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "timezone('utc', now())", onUpdate: "timezone('utc', now())" })
  updatedAt: Date;

  static async findOrCreate<T extends BaseEntity>(this: ObjectType<T>, attributes: FindConditions<T>, createWithAttributes: DeepPartial<T> = {}): Promise<[T, boolean]> {
    const repository = (this as any).getRepository()

    const model = await repository.findOne({where: attributes})

    if (!model) {
      const create = repository.create({...attributes, ...createWithAttributes})
    	await create.save()

    	return [create, true];
    }

    return [model, false];
  }

  static async updateOrCreate<T extends CustomEntity>(this: ObjectType<T>, searchAttributes: DeepPartial<T>, createAttributes: DeepPartial<T>): Promise<T> {
    const repository = (this as typeof CustomEntity).getRepository()

    let created;
    const result = await repository.update(searchAttributes, createAttributes)

    if (!result || typeof result.affected === 'undefined' || result.affected < 1){
      created = repository.create({...searchAttributes, ...createAttributes})
      await created.save();
    }

    return repository.findOneOrFail({where: searchAttributes}) as any
  }

  /** Get relation by string. Does not update parent objects */
  async relation<P extends CustomEntity, T extends KeysOfType<this, CustomEntity | CustomEntity[] | undefined | null>>(this: P, relation: T): Promise<this[T]> {
    let constructor = this.constructor as any;
    let instance = await constructor.findOneOrFail((this as any).id, { relations: [relation] })
    return Promise.resolve(instance[relation])
  }

  async fetchRelations(...relations: string[]) {
    if (relations.length === 0) {
      return;
    }

    const constructor = this.constructor as any;
    const instance = await constructor.findOneOrFail((this as any).id, { relations: [...relations] })

    const allowed = relations.filter(item => item.split('.').length === 1);

    const filtered = Object.keys(instance)
      .filter(key => allowed.includes(key))
      .reduce((obj: any, key: any) => {
        obj[key] = instance[key];
        return obj;
      }, {});

    constructor.merge(this, filtered)
  }

  async reload(...relations: string[]) {
    await this.fetchRelations(...relations)
    await super.reload();
  }
}





