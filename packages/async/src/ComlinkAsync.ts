import { ComlinkCore, STORE_TYPE, helper, ExportStore, ImportStore } from "@bfchain/comlink-core";
import { EmscriptenReflect, isObj } from "@bfchain/comlink-typings";
import { HolderReflect } from "./HolderReflect";
import { CallbackToAsync } from "./helper";
import {
  ModelTransfer,
  globalSymbolStore,
  IOB_Extends_Type,
  IOB_EFT_Factory_Map,
  getFunctionType,
  IOB_Extends_Object_Status,
  IOB_Extends_Function_ToString_Mode,
  getFunctionExportDescription,
  IMPORT_FUN_EXTENDS_SYMBOL,
  refFunctionStaticToStringFactory,
} from "@bfchain/comlink-protocol";
import { AsyncModelTransfer } from "./AsyncModelTransfer";

export class ComlinkAsync
  extends ComlinkCore<ComlinkProtocol.IOB, ComlinkProtocol.TB, ComlinkProtocol.IOB_E>
  implements BFChainComlink.ComlinkAsync {
  constructor(port: ComlinkProtocol.BinaryPort, name: string) {
    super(port, name);
  }

  readonly transfer = new AsyncModelTransfer(this);
  readonly exportStore = new ExportStore(this.name);
  readonly importStore = new ImportStore<
    ComlinkProtocol.IOB,
    ComlinkProtocol.TB,
    ComlinkProtocol.IOB_E
  >(this.name, this.port, this.transfer);

  // readonly holderStore = new HolderStore(this.name);

  protected $getEsmReflectHanlder(opeartor: EmscriptenReflect) {
    const hanlder = super.$getEsmReflectHanlder(opeartor);
    if (opeartor === EmscriptenReflect.Apply || opeartor === EmscriptenReflect.SyncApply) {
      const applyHanlder = (target: Function, args: unknown[]) => {
        if (target === Function.prototype.toString) {
          const ctx = args[0] as Function;
          const exportDescriptor = getFunctionExportDescription(ctx);
          /// 保护源码
          if (!exportDescriptor.showSourceCode) {
            // console.log("get to string from remote");
            return IOB_EFT_Factory_Map.get(getFunctionType(ctx))!.toString({ name: ctx.name });
          }
        }
        return hanlder.fun(target, args);
      };
      return { type: hanlder.type, fun: applyHanlder };
    }
    return hanlder;
  }

  async import<T>(key = "default"): Promise<BFChainComlink.AsyncUtil.Remote<T>> {
    const importModule = await CallbackToAsync(this.$getImportModule, [], this);
    return Reflect.get(importModule, key);
  }
  push(obj: object) {
    return CallbackToAsync(this.$pushToRemote, [obj], this);
  }
}
