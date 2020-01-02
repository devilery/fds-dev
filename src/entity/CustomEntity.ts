import { BaseEntity, CreateDateColumn, UpdateDateColumn } from "typeorm";

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
}

