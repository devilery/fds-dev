type Unpack<T> = T extends Promise<infer U> ? U : T;

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait = 0): T {
  let debouceKey: any = {}

  function returnFn(this: any, ...args: any[]) {
    const key = args.join('');

    if (!debouceKey[key]) {
      debouceKey[key] = {}
    }

    if (!debouceKey[key].latestResolve) { // The first call since last invocation.
      return new Promise((resolve, reject) => {
        debouceKey[key].latestResolve = resolve
        debouceKey[key].timerId = setTimeout(invokeAtTrailing.bind(this, args, resolve, reject), wait)
      })
    }

    debouceKey[key].shouldCancel = true
    return new Promise((resolve, reject) => {
      debouceKey[key].latestResolve = resolve
      debouceKey[key].timerId = setTimeout(invokeAtTrailing.bind(this, args, resolve, reject), wait)
    })
  }

  return returnFn as any;

  function invokeAtTrailing(this: any, args: any[], resolve: any, reject: any) {
    const key = args.join('');

    if (debouceKey[key].shouldCancel && resolve !== debouceKey[key].latestResolve) {
      return;
    } else {
      func.apply(this, args).then(resolve).catch(reject)
      debouceKey[key].shouldCancel = false
      clearTimeout(debouceKey[key].timerId)
      debouceKey[key].timerId = debouceKey[key].latestResolve = null
    }
  }
}