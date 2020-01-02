import { BaseEntity, CreateDateColumn, UpdateDateColumn, ObjectType } from "typeorm";

type KeysOfType<T, TProp> = { [P in keyof T]: T[P] extends TProp ? P : never }[keyof T];


export default class CustomEntity extends BaseEntity {
  @CreateDateColumn({ type: "timestamp", default: () => "timezone('utc', now())" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "timezone('utc', now())", onUpdate: "timezone('utc', now())" })
  updatedAt: Date;

  static async findOrCreate<T extends CustomEntity>(this: typeof T, attributes: {}, createWithAttributes: {}): Promise<[T, boolean]> {
    const model = await this.findOne({where: attributes})

    if (!model) {
    	const create = this.create({...attributes, ...createWithAttributes})
    	await create.save()

    	return [create, true];
    }

    return [model, false];
  }

  async relation<T extends KeysOfType<this, CustomEntity | CustomEntity[] | undefined | null>>(...relations: T[]): Promise<void> {
    let constructor = this.constructor as any;
    let instance = await constructor.findOneOrFail((this as any).id, { relations: [...relations] })

    for (let relation of relations) {
      this[relation] = instance[relation];
    }
    
    return Promise.resolve()
  }
}





