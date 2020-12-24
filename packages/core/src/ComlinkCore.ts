import { LinkObjType, EmscriptenReflect } from "@bfchain/comlink-typings";
import { ESM_REFLECT_FUN_MAP, OpenArg, resolveCallback, SyncPiperFactory } from "./helper";
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
    port.onMessage((cb, bin) => {
      const out_void = () => resolveCallback(cb, undefined);

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
        const out_linkOut = (anyRes: unknown) => {
          this.transfer.Any2InOutBinary((iobRet) => {
            if (iobRet.isError) {
              return cb(iobRet);
            }
            linkOut.out.push(iobRet.data);
            resolveCallback(cb, this.transfer.linkObj2TransferableBinary(linkOut));
          }, anyRes);
        };

        try {
          let res: any;
          /**JS语言中，this对象不用传输。
           * 但在Comlink协议中，它必须传输：
           * 因为我们使用call/apply模拟，所以所有所需的对象都需要传递进来
           */
          const operator = this.transfer.InOutBinary2Any(linkObj.in[0]) as EmscriptenReflect;
          const paramList = linkObj.in.slice(1).map((iob) => this.transfer.InOutBinary2Any(iob));

          if (EmscriptenReflect.Multi === operator) {
            /// 批量操作
            res = obj;
            for (let i = 0; i < paramList.length; ) {
              const len = paramList[i] as number;
              const $operator = paramList[i + 1] as EmscriptenReflect;
              const $paramList = paramList.slice(i + 2, i + 1 + len);
              const $handler = this.$getEsmReflectHanlder($operator);
              res = $handler(res, $paramList);
              i += len + 1;
            }
          } else {
            /// 单项操作
            const handler = this.$getEsmReflectHanlder(operator);
            res = handler(obj, paramList);
          }

          /// 如果有返回结果的需要，那么就尝试进行返回
          if (linkObj.hasOut) {
            return out_linkOut(res);
          } else {
            return out_void();
          }
        } catch (err) {
          linkOut.isThrow = true;
          return out_linkOut(err);
        }
      } else if (linkObj.type === LinkObjType.Import) {
        const scope = this._getInitedExportScope();
        return this.transfer.Any2InOutBinary((scopeRet) => {
          if (scopeRet.isError) {
            return cb(scopeRet);
          }
          resolveCallback(
            cb,
            this.transfer.linkObj2TransferableBinary({
              type: LinkObjType.Export,
              module: scopeRet.data,
            }),
          );
        }, scope);
      } else if (linkObj.type === LinkObjType.Release) {
        exportStore.releaseById(linkObj.locId);
      }
      out_void();
    });
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
