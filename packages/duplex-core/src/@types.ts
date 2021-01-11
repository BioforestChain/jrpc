declare namespace BFChainLink {
  interface Duplex extends Channel.Duplex<ComlinkProtocol.TB> {}
  namespace Duplex {
    type _ = typeof import("@bfchain/link-protocol");
    interface Factory {
      getDuplex(): Duplex;
      asMain(worker: unknown): void;
    }
    namespace Factory {
      interface Ctor {
        new (): Factory;
        asCluster: AsCluster;
        prototype: Factory;
      }
      type AsCluster = (worker: unknown) => PromiseLike<Factory>;
    }

    type SABS = { locale: SharedArrayBuffer; remote: SharedArrayBuffer };
    type CachedChunkInfo = Map<number, Uint8Array>; // { chunk: Uint8Array; range: [{ start: number; end: number }] };
    type PostMessage_ApplyWrite_HookArg = {
      waitI32a: Int32Array;
      waitIndex: number;
      waitValue: number;
      next: () => void;
    };
    type PostMessage_ChunkReady_HookArg = {
      waitI32a: Int32Array;
      waitIndex: number;
      waitValue: number;
      chunkCount: number;
      chunkId: number;
      next: () => void;
    };

    type Endpoint = {
      onMessage(listener: (data: Endpoint.Message) => unknown): void;
      postMessage(data: Endpoint.Message, transferList: Array<object>): void;
      postMessage(data: Endpoint.Message): void;
    };
    namespace Endpoint {
      type Message =
        | [import("./const").SIMPLEX_MSG_TYPE.NOTIFY, Uint8Array]
        | [import("./const").SIMPLEX_MSG_TYPE.TRANSFER, object];
    }
    // type EndpointFactory = (port: unknown) => Endpoint;
  }
}
