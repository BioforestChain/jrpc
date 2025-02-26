import { ComlinkSync } from "@bfchain/link";
import { performance } from "perf_hooks";

class ConfigServiceChild {
  private config: { [key: string]: unknown } = {};
  set(key: string, value: unknown) {
    console.log("set", key);
    return Reflect.set(this.config, key, value);
  }
  get<T>(key: string) {
    console.log("get", key);
    return Reflect.get(this.config, key) as T | undefined;
  }
}

export class ConfigService {
  private config: { [key: string]: unknown } = {};
  reset() {
    this.config = {};
  }
  /**不可拓展，但是可以删除可以修改 */
  preventExtensions() {
    Object.preventExtensions(this.config);
  }
  /**不可添加不可删除，但是可以修改 */
  seal() {
    Object.seal(this.config);
  }
  /**不可添加不可删除不可修改 */
  freeze() {
    Object.freeze(this.config);
  }
  set(key: string, value: unknown) {
    return Reflect.set(this.config, key, value);
  }
  get<T>(key: string) {
    return Reflect.get(this.config, key) as T | undefined;
  }
  del(key: string) {
    return Reflect.deleteProperty(this.config, key);
  }

  readonly child = new ConfigServiceChild();

  static testAll(ctxA: ConfigService, TIMES: number) {
    const s = performance.now();
    for (let i = 0; i < TIMES; i++) {
      // freedom mode
      ctxA.reset();
      console.assert(ctxA.set("a", 1) === true, "freedom, could insert");
      console.assert(ctxA.get("a") === 1, "freedom, check get");
      console.assert(ctxA.del("a") === true, "freedom, could del");

      // preventExtensions mode
      ctxA.reset();
      ctxA.set("a", 1);
      ctxA.set("b", 1);
      ctxA.preventExtensions();
      console.assert(ctxA.set("a", 2) === true, "preventExtensions, could update");
      console.assert(ctxA.get("a") === 2, "preventExtensions, check get");
      console.assert(ctxA.del("b") === true, "preventExtensions, could del");
      console.assert(ctxA.set("b", 2) === false, "preventExtensions, could not insert");

      // seal mode
      ctxA.reset();
      ctxA.set("a", 1);
      ctxA.seal();
      console.assert(ctxA.set("a", 3) === true, "seal, could update");
      console.assert(ctxA.get("a") === 3, "seal, check get");
      console.assert(ctxA.set("b", 3) === false, "seal, could note insert");
      console.assert(ctxA.del("a") === false, "seal, could note delete");

      // freeze mode
      ctxA.reset();
      ctxA.set("a", 1);
      ctxA.seal();
      ctxA.freeze();
      console.assert(ctxA.set("a", 4) === false, "freeze, could note update");
      console.assert(ctxA.get("a") === 1, "freeze, check get");
      console.assert(ctxA.set("b", 4) === false, "freeze, could note insert");
      console.assert(ctxA.del("a") === false, "freeze, could note delete");
    }
    return performance.now() - s;
  }
  static async testAll2(ctxA: BFChainLink.AsyncUtil.Remote<ConfigService>, TIMES: number) {
    const s = performance.now();
    for (let i = 0; i < TIMES; i++) {
      // freedom mode
      await ctxA.reset();
      console.assert((await ctxA.set("a", 1)) === true, "freedom, could insert");
      console.assert((await ctxA.get("a")) === 1, "freedom, check get");
      console.assert((await ctxA.del("a")) === true, "freedom, could del");

      // preventExtensions mode
      await ctxA.reset();
      await ctxA.set("a", 1);
      await ctxA.set("b", 1);
      await ctxA.preventExtensions();
      console.assert((await ctxA.set("a", 2)) === true, "preventExtensions, could update");
      console.assert((await ctxA.get("a")) === 2, "preventExtensions, check get");
      console.assert((await ctxA.del("b")) === true, "preventExtensions, could del");
      console.assert((await ctxA.set("b", 2)) === false, "preventExtensions, could not insert");

      // seal mode
      await ctxA.reset();
      await ctxA.set("a", 1);
      await ctxA.seal();
      console.assert((await ctxA.set("a", 3)) === true, "seal, could update");
      console.assert((await ctxA.get("a")) === 3, "seal, check get");
      console.assert((await ctxA.set("b", 3)) === false, "seal, could note insert");
      console.assert((await ctxA.del("a")) === false, "seal, could note delete");

      // freeze mode
      await ctxA.reset();
      await ctxA.set("a", 1);
      await ctxA.seal();
      await ctxA.freeze();
      console.assert((await ctxA.set("a", 4)) === false, "freeze, could note update");
      console.assert((await ctxA.get("a")) === 1, "freeze, check get");
      console.assert((await ctxA.set("b", 4)) === false, "freeze, could note insert");
      console.assert((await ctxA.del("a")) === false, "freeze, could note delete");
    }
    return performance.now() - s;
  }
  static async test3(ctxA: BFChainLink.AsyncUtil.Remote<ConfigService>) {
    const a1 = await ctxA.child.set("a", 1);
    const a2 = await ctxA.child.get("a");
    console.assert(a1 === a2);
  }
}
