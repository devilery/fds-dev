import { ValueTransformer } from "typeorm";

export const bigInt: ValueTransformer = {
  to: (entityValue: number) => {
    return entityValue
  },
  from: (databaseValue: string) => {
    return parseInt(databaseValue);
  }
};