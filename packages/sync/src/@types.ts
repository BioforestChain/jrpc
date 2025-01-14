declare namespace BFChainLink {
  /**
   * IOB : InOutBinary
   * TB : TransferableBinary
   */
  interface ComlinkSync extends ComlinkCore {
    /**导入
     * 同语法：
     * import ? from port
     * import { key } from port
     */
    import<T>(key?: string): T;

    /**
     * 强制推送对象到对方。
     * 等同于远端创建的对象被本地import
     *
     * 可以用于一些内存对象的传输。比如 ArrayBufer、MessagePort
     * @param obj
     */
    push(obj: object): void;
  }

  type AsyncToSync<T> = T extends (...args: infer ARGS) => infer Return
    ? (...args: ARGS) => Util.Promisify<Return>
    : T;
  type SyncToAsync<T> = T extends (...args: infer ARGS) => infer Return
    ? (...args: ARGS) => Util.Unpromisify<Return>
    : T;
}
