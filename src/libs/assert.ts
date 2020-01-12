import { strictEqual } from 'assert'

// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions
// https://github.com/microsoft/TypeScript/issues/34596#issuecomment-544233972
export default function assert(value: unknown, message?: string): asserts value {
    strictEqual(!!value, true, message)
}
