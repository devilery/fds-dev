import { ValueTransformer } from "typeorm";

export const bigInt: ValueTransformer = {
  to: (entityValue: number) => {
    return entityValue
  },
  from: (databaseValue: string) => {
    return parseInt(databaseValue);
  }
};

class DBError extends Error {
  constructor(message: string, code: string) {
    super(message);
    this.name = 'DBError';
    (this as any).code = code
  }
}

function KeepAsyncStackTrace(target: any, key: string) {
  if (target.prototype === undefined) {
    return;
  }

  let descriptor = Object.getOwnPropertyDescriptor(target, key)!
  let method = descriptor.value;
  descriptor.value = function (...args: any[]) {
    const res = method.apply(this, args)

    if (res instanceof Promise) {

      return res
        .catch(function (e: Error) {
          throw new DBError(e.message, e.code)
        });
    } else {
      return res
    }
  }

  Object.defineProperty(target, key, descriptor);
}

export function DecorateAsyncMethods(target: any) {
  const getMethods = (obj: any) => {
    let properties = new Map()
    let currentObj = obj
    do {
      Object.getOwnPropertyNames(currentObj)
        .filter(item => !['caller', 'callee', 'arguments', 'target'].includes(item) || item.indexOf('__') > -1)
        .filter(item => currentObj[item] instanceof Function)
        .map(item => {
          let objItem = { key: item, target: currentObj }
          properties.set(item, objItem)
        })
    } while ((currentObj = Object.getPrototypeOf(currentObj)))
    return properties
  }

  const instanceMethods = getMethods(target.prototype)
  const staticMethods = getMethods(target)

  const methods = [...instanceMethods.values(), ...staticMethods.values()];
  for (let method of methods) {
    KeepAsyncStackTrace(method.target, method.key);
  }
}