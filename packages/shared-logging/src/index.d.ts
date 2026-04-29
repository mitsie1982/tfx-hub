type Meta = Record<string, unknown>;

type RequestLogger = {
  requestId: string;
  log: Logger;
  meta: Meta;
};

type Logger = {
  child(name: string): Logger;
  info(msg: string, meta?: Meta): void;
  warn(msg: string, meta?: Meta): void;
  error(msg: string, meta?: Meta): void;
  debug(msg: string, meta?: Meta): void;
  startRequest(meta?: Meta & { requestId?: string }): RequestLogger;
};

declare function createLogger(serviceName?: string): Logger;

export = createLogger;
