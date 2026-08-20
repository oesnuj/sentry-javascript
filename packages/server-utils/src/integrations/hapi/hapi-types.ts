/*
 * Structural type definitions and constants ported from the vendored
 * `@opentelemetry/instrumentation-hapi` types, with all `@hapi/*` and
 * `@opentelemetry/*` dependencies removed. Only the shapes actually accessed by
 * the orchestrion hapi subscriber are kept.
 */

// Single source of truth for the request lifecycle extension points, so the
// `ServerRequestExtType` union and the runtime `HapiLifecycleMethodNames` set
// below can't drift apart.
const LIFECYCLE_EXT_POINTS = [
  'onPreAuth',
  'onCredentials',
  'onPostAuth',
  'onPreHandler',
  'onPostHandler',
  'onPreResponse',
  'onRequest',
] as const;

export type ServerRequestExtType = (typeof LIFECYCLE_EXT_POINTS)[number];

export type LifecycleMethod = (request: unknown, h: unknown, err?: Error) => unknown;

export interface ServerRouteOptions {
  handler?: LifecycleMethod | unknown;
  [key: string]: unknown;
}

export interface ServerRoute {
  path: string;
  method: string;
  handler?: LifecycleMethod | unknown;
  options?: ((server: unknown) => ServerRouteOptions) | ServerRouteOptions;
  [key: string]: unknown;
}

export interface ServerExtEventsObject {
  type: string;
  [key: string]: unknown;
}

export interface ServerExtEventsRequestObject {
  type: ServerRequestExtType;
  method: LifecycleMethod;
  [key: string]: unknown;
}

export interface ServerExtOptions {
  [key: string]: unknown;
}

/**
 * This symbol is used to mark a Hapi route handler or server extension handler as
 * already patched, since it's possible to use these handlers multiple times
 * i.e. when allowing multiple versions of one plugin, or when registering a plugin
 * multiple times on different servers.
 */
export const handlerPatched: unique symbol = Symbol('hapi-handler-patched');

export type PatchableServerRoute = ServerRoute & {
  [handlerPatched]?: boolean;
};

export type PatchableExtMethod = LifecycleMethod & {
  [handlerPatched]?: boolean;
};

export type ServerExtDirectInput = [ServerRequestExtType, LifecycleMethod, (ServerExtOptions | undefined)?];

export const HapiLayerType = {
  ROUTER: 'router',
  PLUGIN: 'plugin',
  EXT: 'server.ext',
} as const;

export const HapiLifecycleMethodNames = new Set<string>(LIFECYCLE_EXT_POINTS);

/** The `request`/`error` event payload passed to the error listener. */
export interface HapiRequestEvent {
  error?: unknown;
  [key: string]: unknown;
}

/** The subset of a hapi request the error listener reads. */
export interface HapiRequest {
  route: { path?: string; method: string };
  [key: string]: unknown;
}

/** The shared hapi server event emitter (`core.events`, a Podium instance). */
export interface HapiServerEvents {
  on(
    criteria: { name: string; channels: string[] },
    listener: (request: HapiRequest, event: HapiRequestEvent) => void,
  ): void;
  [key: string]: unknown;
}

/** The subset of a hapi server the error handler needs. */
export interface HapiServer {
  events: HapiServerEvents;
  [key: string]: unknown;
}

export enum AttributeNames {
  HAPI_TYPE = 'hapi.type',
  PLUGIN_NAME = 'hapi.plugin.name',
  EXT_TYPE = 'server.ext.type',
}
