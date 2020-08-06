import { TransferMap } from "./TransferMap";

export class TransferHandlerMap extends TransferMap<
  BFChainComlink.TransferHanlderKeyValue
> {
  set(
    name: BFChainComlink.TransferHanlderKeyValue["Key"],
    transferHandler: BFChainComlink.TransferHandler.Any
  ) {
    /// try remove old one first. ensure transferHandler exists in one map only
    this.delete(name);

    let type: BFChainComlink.TransferMap.Type;
    if ("canHandle" in transferHandler) {
      if ("deserialize" in transferHandler) {
        type = "both";
        this._map[type].set(name, {
          type,
          canHandle: transferHandler.canHandle,
          serialize: transferHandler.serialize,
          deserialize: transferHandler.deserialize
        });
      } else {
        type = "serialize";
        this._map[type].set(name, {
          type,
          canHandle: transferHandler.canHandle,
          serialize: transferHandler.serialize
        });
      }
    } else {
      type = "deserialize";
      this._map[type].set(name, {
        type,
        deserialize: transferHandler.deserialize
      });
    }
    /// falg the TransferName's TransferType
    this._nameTypeMap.set(name, type);
  }
}
