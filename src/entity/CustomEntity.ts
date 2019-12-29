import { BaseEntity } from "typeorm";

export default class CustomEntity extends BaseEntity {
  static async findOrCreate<T extends CustomEntity>(this: typeof T, attributes: {}, createWithAttributes: {}): Promise<T> {
    const model = await this.findOne({where: attributes})

    if (!model) {
    	const create = this.create({...attributes, ...createWithAttributes})
    	await create.save()

    	return create;
    }

    return model;
  }
}

