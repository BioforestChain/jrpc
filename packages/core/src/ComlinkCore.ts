import { LinkObjType, EmscriptenReflect } from "@bfchain/comlink-typings";
import { ESM_REFLECT_FUN_MAP, OpenArg, SyncForCallback, SyncPiperFactory } from "./helper";
import { ExportStore } from "./ExportStore";
import { ImportStore } from "./ImportStore";

export abstract class ComlinkCore<IOB /*  = unknown */, TB /*  = unknown */, IMP_EXTENDS> {
  constructor(public readonly port: BFChainComlink.BinaryPort<TB>, public readonly name: string) {
    this._listen();
  }
  $destroy(): boolean {
    throw new Error("Method not implemented.");
  }

  abstract readonly transfer: BFChainComlink.ModelTransfer<IOB, TB>;

  readonly exportStore = new ExportStore(this.name);
  readonly importStore = new ImportStore<IMP_EXTENDS>(this.name);

  /**用于存储导出的域 */
  private _exportModule = { scope: Object.create(null), isExported: false };
  private _getInitedExportScope() {
    const { _exportModule } = this;
    if (_exportModule.isExported === false) {
      _exportModule.isExported = true;
      this.exportStore.exportObject(_exportModule.scope);
    }
    return _exportModule.scope;
  }
  export(source: unknown, name = "default") {
    Reflect.set(this._getInitedExportScope(), name, source);
  }
  protected $getEsmReflectHanlder(operator: EmscriptenReflect) {
    const handler = ESM_REFLECT_FUN_MAP.get(operator);
    if (!handler) {
      throw new SyntaxError("no support operator:" + operator);
    }
    return handler;
  }
  private _listen() {
    const { exportStore: exportStore, port } = this;
    port.onMessage((cb, bin) =>
      SyncForCallback(cb, () => {
        const linkObj = this.transfer.transferableBinary2LinkObj(bin);

        if (linkObj.type === LinkObjType.In) {
          const obj = exportStore.getObjById(linkObj.targetId);
          if (obj === undefined) {
            throw new ReferenceError("no found");
          }
          /**预备好结果 */
          const linkOut: BFChainComlink.LinkOutObj<IOB> = {
            type: LinkObjType.Out,
            // resId: linkObj.reqId,
            out: [],
            isThrow: false,
          };
          try {
            let res;

            /**JS语言中，this对象不用传输。
             * 但在Comlink协议中，它必须传输：
             * 因为我们使用call/apply模拟，所以所有所需的对象都需要传递进来
             */
            const operator = this.transfer.InOutBinary2Any(linkObj.in[0]) as EmscriptenReflect;
            const paramList = linkObj.in.slice(1).map((iob) => this.transfer.InOutBinary2Any(iob));

            if (EmscriptenReflect.Multi === operator) {
              /// 批量操作
              res = obj;
              for (let i = 0; i < paramList.length; i++) {
                const len = paramList[i] as number;
                const $operator = paramList[i + 1] as EmscriptenReflect;
                const $paramList = paramList.slice(i + 1, i + len);
                const $handler = this.$getEsmReflectHanlder($operator);
                res = $handler(res, $paramList);
              }
            } else {
              /// 单项操作
              const handler = this.$getEsmReflectHanlder(operator);
              res = handler(obj, paramList);

              // const { holderStore } = this;
              // /// 如果可以且需要，启用占位符模式
              // if (
              //   holderStore &&
              //   (operator === EmscriptenReflect.Get ||
              //     operator === EmscriptenReflect.Apply ||
              //     operator === EmscriptenReflect.Construct)
              // ) {
              //   /// 如果占位符模式下 远端对象的操作
              //   if (this.importStore.isProxy(obj)) {
              //     // 生成占位符
              //     const pid = holderStore.createPid();
              //     paramList.unshift(pid);
              //     const shouldPid = handler(obj, paramList);
              //     if (shouldPid !== pid) {
              //       throw new Error("should return pid when in placehoder mode.");
              //     }
              //     res = holderStore.importValueByPid(pid);
              //   }
              //   /// 占位符模式下，本地对象的操作
              //   else {
              //     // 读取占位符
              //     const pid = paramList.shift() as PlaceId;
              //     res = handler(obj, paramList);
              //     holderStore.exportValueAsPid(pid, res);
              //   }
              // } else {
              //   res = handler(obj, paramList);
              // }
            }

            /// 如果有返回结果的需要，那么就尝试进行返回
            if (linkObj.hasOut) {
              linkOut.out.push(this.transfer.Any2InOutBinary(res));
            }
          } catch (err) {
            linkOut.isThrow = true;
            // 将错误放在之后一层
            linkOut.out.push(this.transfer.Any2InOutBinary(err));
          }
          return this.transfer.linkObj2TransferableBinary(linkOut);
        } else if (linkObj.type === LinkObjType.Import) {
          const scope = this._getInitedExportScope();
          return this.transfer.linkObj2TransferableBinary({
            type: LinkObjType.Export,
            module: this.transfer.Any2InOutBinary(scope),
          });
        } else if (linkObj.type === LinkObjType.Release) {
          exportStore.releaseById(linkObj.locId);
        }
      }),
    );
    this.importStore.onRelease((refId) => {
      // console.log("send release", refId);
      port.send(
        this.transfer.linkObj2TransferableBinary({
          type: LinkObjType.Release,
          locId: refId,
        }),
      );
    });
  }
  //#endregion

  //#region 进口

  /**用于存储导入的域 */
  private _importModule?: object;
  protected $getImportModule(output: BFChainComlink.Callback<object>) {
    const { port } = this;
    /**
     * 进行协商握手，取得对应的 refId
     * @TODO 这里将会扩展出各类语言的传输协议
     */
    if (this._importModule === undefined) {
      port.req(
        SyncPiperFactory(output, (ret) => {
          const bin = OpenArg(ret);
          const linkObj = this.transfer.transferableBinary2LinkObj(bin);
          if (linkObj.type !== LinkObjType.Export) {
            throw new TypeError();
          }
          /// 握手完成，转成代理对象
          return (this._importModule = this.transfer.InOutBinary2Any(linkObj.module) as object);
        }),
        this.transfer.linkObj2TransferableBinary({ type: LinkObjType.Import }),
      );
      return;
    }
    output({
      isError: false,
      data: this._importModule,
    });
  }
}
