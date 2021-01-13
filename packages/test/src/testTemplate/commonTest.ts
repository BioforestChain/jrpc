// 通用测试

import { format } from "util";

/**基础测试类 */
export class TestService {
  private name = "Gaubee";
  say(word: string) {
    return `${this.name}: xxxx-${word}-xxxx`;
  }
  useCallback<T, R>(arg: T, cb: (arg: T) => R) {
    return cb(arg);
  }
  /// 无泛型，类型清晰
  useCallback2(
    arg: { firstName: string; lastName: string },
    cb: (arg: { firstName: string; lastName: string }) => string,
  ) {
    return cb(arg);
  }
  /// 部分类型清晰
  useCallback3<T, R>(arg: T, cb: (arg: string) => R, _1: number, _2: (arg: number) => void) {
    return cb(String(arg));
  }
  concat<T>(arr1: T[], arr2: T[]) {
    return arr1.concat(arr2);
  }
  toPrimitive(obj: unknown, type: "number" | "string") {
    if (type === "number") {
      return Number(obj);
    }
    return String(obj);
  }
  throwLocalError(message: string) {
    throw new Error(message);
  }
  throwLocal(error: unknown) {
    throw error;
  }
  throwRemoteError(err: Error) {
    throw err;
  }
  think(ms: number) {
    return new Promise((cb) => setTimeout(cb, ms));
  }
  work(n: number) {
    const fib = (n: number): number => {
      if (n === 0 || n === 1) {
        return n;
      }
      return fib(n - 1) + fib(n - 2);
    };
    return fib(n);
  }
  static JsonAbleObj = { a: 1, b: ["c", true] };
  jsonAble() {
    return TestService.JsonAbleObj;
  }
  stringify(obj: object) {
    return JSON.stringify(obj);
  }

  //#region 正常模式测试

  static testApply(ctxA: TestService) {
    console.assert(ctxA.say("qaq") === "Gaubee: xxxx-qaq-xxxx", "call say");
    console.assert(
      ctxA.constructor.toString() === `class TestService { [remote code] }`,
      "toString",
    );
    console.assert(
      ctxA.useCallback({ k: "qaq", v: "quq" }, (arg) => {
        return arg.k.length + arg.v.length;
      }) === 6,
      "use callback",
    );
  }
  static testFunctionType(ctxA: TestService) {
    console.assert(ctxA.constructor.toString === ctxA.say.toString, "Function.prototype.toString");
    console.assert(
      ctxA.constructor.toString.toString() === "function toString() { [remote code] }",
      "Function.prototype.toString is in local",
    );
    console.assert(typeof ctxA.constructor === "function", "ctor is function");
    console.assert(
      ctxA.constructor instanceof Function === false,
      "ctor no current isolate's function",
    );
    console.assert(ctxA instanceof ctxA.constructor, "instanceof");
  }
  static testSymbol(ctxA: TestService) {
    const arr = [1];
    console.assert(format(ctxA.concat(arr, [2])) === "[ 1, 2 ]", "isConcatSpreadable === true");
    Object.defineProperty(arr, Symbol.isConcatSpreadable, { value: false });
    console.assert(
      format(ctxA.concat(arr, [2])) === "[ [ 1 ], 2 ]",
      "isConcatSpreadable === false",
    );

    let latestHit = "";
    const obj = {
      [Symbol.toPrimitive](hint: string) {
        latestHit = hint;
        if (hint === "number") {
          return 123;
        }
        if (hint === "string") {
          return "qaq";
        }
        return null;
      },
    };
    const obj2 = Object.create(obj);
    console.assert(ctxA.toPrimitive(obj, "number") === 123, "to number");
    console.assert(latestHit === "number");
    console.assert(ctxA.toPrimitive(obj2, "string") === "qaq", "to string");
    console.assert(latestHit === "string");
  }
  static testThrow(ctxA: TestService) {
    try {
      ctxA.throwLocalError("qaq1");
    } catch (err) {
      console.assert(String(err).startsWith("Error: qaq1"), "throw 1");
    }
    let err = new SyntaxError("qaq2");
    try {
      ctxA.throwRemoteError(err);
    } catch (err) {
      console.assert(String(err).startsWith("SyntaxError: qaq2"), "throw 2");
    }
  }
  static testJSON(ctxA: TestService) {
    console.assert(
      JSON.stringify(ctxA.jsonAble()) === JSON.stringify(TestService.JsonAbleObj),
      "JSON.stringify",
    );
  }
  static testPromise(ctxA: TestService) {
    return Promise.all([ctxA.think(10), ctxA.think(10)]);
  }

  static async testAll(ctxA: TestService) {
    this.testApply(ctxA);
    this.testFunctionType(ctxA);
    this.testSymbol(ctxA);
    this.testThrow(ctxA);
    this.testJSON(ctxA);
    await this.testPromise(ctxA);
  }
  //#endregion

  //#region 异步模式测试

  static async testApply2(ctxA: BFChainLink.AsyncUtil.Remote<TestService>) {
    console.assert((await ctxA.say("qaq")) === "Gaubee: xxxx-qaq-xxxx", "call say");
    console.assert(
      (await ctxA.constructor.toString()) === `class TestService { [remote code] }`,
      "toString",
    );
    const localArg = { firstName: "qaq", lastName: "quq" };
    const len = await ctxA.useCallback<number>(localArg, (_: typeof localArg) => {
      const arg = _ as typeof localArg;
      return arg.firstName.length + arg.lastName.length;
    });

    console.assert(len === 6, "use callback");

    const fullName = await ctxA.useCallback2(localArg, (arg) => {
      return `${arg.firstName} ${arg.lastName}`;
    });
    console.assert(fullName === "qaq quq", "use callback");

    const argLength = await ctxA.useCallback3(
      123,
      (arg) => {
        return arg.length;
      },
      456,
      (_) => {},
    );
    console.assert(argLength === 3, "use callback");
  }
  static async testFunctionType2(ctxA: BFChainLink.AsyncUtil.Remote<TestService>) {
    // 因为不支持实时的属性get，所以即便是 === 操作也完成不了
    // console.assert(ctxA.constructor.toString === ctxA.say.toString, "Function.prototype.toString");
    console.assert(
      (await ctxA.constructor.toString.toString()) === "function toString() { [remote code] }",
      "Function.prototype.toString is in local",
    );
    console.assert(typeof ctxA.constructor === "function", "ctor is function");
  }
  static async testSymbol2(ctxA: BFChainLink.AsyncUtil.Remote<TestService>) {
    const arr = [1];
    console.assert(
      format(await ctxA.concat(arr, [2])) === "[ 1, 2 ]",
      "isConcatSpreadable === true",
    );
    Object.defineProperty(arr, Symbol.isConcatSpreadable, { value: false });
    console.assert(
      format(await ctxA.concat(arr, [2])) === "[ [ 1 ], 2 ]",
      "isConcatSpreadable === false",
    );
  }
  static async testThrow2(ctxA: BFChainLink.AsyncUtil.Remote<TestService>) {
    try {
      await ctxA.throwLocal("qaq3");
    } catch (err) {
      console.assert(err === "qaq3", "throw 3");
    }
    try {
      await ctxA.throwLocalError("qaq4");
    } catch (err) {
      const zz = await err.message;
      console.assert((await err.message) === "qaq4", "throw 4");
    }
  }
  static async testPromise2(ctxA: BFChainLink.AsyncUtil.Remote<TestService>) {
    return Promise.all([ctxA.think(10), ctxA.think(10)]);
  }

  static async testCloneAble2(ctxA: BFChainLink.AsyncUtil.Remote<TestService>) {
    const obj = { a: 1, b: [1, "2", true] };
    Object.markCanClone(obj, true);
    console.assert((await ctxA.stringify(obj)) === JSON.stringify(obj), "clone able");
  }

  static async testAll2(ctxA: BFChainLink.AsyncUtil.Remote<TestService>) {
    await this.testApply2(ctxA);
    await this.testFunctionType2(ctxA);
    await this.testSymbol2(ctxA);
    await this.testThrow2(ctxA);
    await this.testPromise2(ctxA);
    await this.testCloneAble2(ctxA);
  }
  //#endregion
}
