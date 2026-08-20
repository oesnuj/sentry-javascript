import * as SentryCore from '@sentry/core';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { attachHapiErrorHandler } from '../../../src/integrations/hapi/hapi-error-handler';
import type { HapiRequest, HapiRequestEvent, HapiServer } from '../../../src/integrations/hapi/hapi-types';

type Listener = (request: HapiRequest, event: HapiRequestEvent) => void;

interface FakeServer {
  server: HapiServer;
  onSpy: MockInstance;
  /** The listener registered on the `request`/`error` event, if any. */
  getListener: () => Listener | undefined;
}

function makeServer(): FakeServer {
  let listener: Listener | undefined;
  const onSpy = vi.fn((_criteria: unknown, cb: Listener) => {
    listener = cb;
  });
  const server = { events: { on: onSpy } } as unknown as HapiServer;
  return { server, onSpy, getListener: () => listener };
}

function makeRequest(path?: string, method = 'get'): HapiRequest {
  return { route: { path, method } } as HapiRequest;
}

describe('attachHapiErrorHandler', () => {
  let captureExceptionSpy: MockInstance;
  let setTransactionNameSpy: MockInstance;
  let isolationScope: { setTransactionName: MockInstance };
  let defaultIsolationScope: { setTransactionName: MockInstance };

  beforeEach(() => {
    setTransactionNameSpy = vi.fn();
    isolationScope = { setTransactionName: setTransactionNameSpy };
    defaultIsolationScope = { setTransactionName: vi.fn() };

    captureExceptionSpy = vi.spyOn(SentryCore, 'captureException').mockImplementation(() => 'id');
    vi.spyOn(SentryCore, 'getIsolationScope').mockReturnValue(isolationScope as unknown as SentryCore.Scope);
    vi.spyOn(SentryCore, 'getDefaultIsolationScope').mockReturnValue(
      defaultIsolationScope as unknown as SentryCore.Scope,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a single listener for the `request`/`error` event', () => {
    const { server, onSpy } = makeServer();

    attachHapiErrorHandler(server);

    expect(onSpy).toHaveBeenCalledTimes(1);
    expect(onSpy).toHaveBeenCalledWith({ name: 'request', channels: ['error'] }, expect.any(Function));
  });

  it('is idempotent across repeat calls on the same server', () => {
    const { server, onSpy } = makeServer();

    attachHapiErrorHandler(server);
    attachHapiErrorHandler(server);

    expect(onSpy).toHaveBeenCalledTimes(1);
  });

  it('attaches once per shared event emitter (e.g. plugin clones)', () => {
    const { server, onSpy } = makeServer();
    // A plugin clone is a different server object sharing the same `events`.
    const clone = { events: server.events } as unknown as HapiServer;

    attachHapiErrorHandler(server);
    attachHapiErrorHandler(clone);

    expect(onSpy).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the server has no event emitter', () => {
    expect(() => attachHapiErrorHandler({} as HapiServer)).not.toThrow();
    expect(() => attachHapiErrorHandler(undefined as unknown as HapiServer)).not.toThrow();
  });

  it('sets a parameterized transaction name and captures the error', () => {
    const { server, getListener } = makeServer();
    attachHapiErrorHandler(server);
    const error = new Error('boom');

    getListener()?.(makeRequest('/users/{id}'), { error } as HapiRequestEvent);

    expect(setTransactionNameSpy).toHaveBeenCalledWith('GET /users/{id}');
    expect(captureExceptionSpy).toHaveBeenCalledWith(error, {
      mechanism: { type: 'auto.function.hapi', handled: false },
    });
  });

  it('does not set the transaction name when the isolation scope is still the default', () => {
    vi.spyOn(SentryCore, 'getIsolationScope').mockReturnValue(defaultIsolationScope as unknown as SentryCore.Scope);
    const { server, getListener } = makeServer();
    attachHapiErrorHandler(server);

    getListener()?.(makeRequest('/users/{id}'), { error: new Error('boom') } as HapiRequestEvent);

    expect(setTransactionNameSpy).not.toHaveBeenCalled();
    expect(defaultIsolationScope.setTransactionName).not.toHaveBeenCalled();
    expect(captureExceptionSpy).toHaveBeenCalledTimes(1);
  });

  it('does not set the transaction name when the route has no path', () => {
    const { server, getListener } = makeServer();
    attachHapiErrorHandler(server);

    getListener()?.(makeRequest(undefined), { error: new Error('boom') } as HapiRequestEvent);

    expect(setTransactionNameSpy).not.toHaveBeenCalled();
    expect(captureExceptionSpy).toHaveBeenCalledTimes(1);
  });

  it('does not capture when the event carries no error', () => {
    const { server, getListener } = makeServer();
    attachHapiErrorHandler(server);

    getListener()?.(makeRequest('/users/{id}'), {} as HapiRequestEvent);

    expect(setTransactionNameSpy).toHaveBeenCalledWith('GET /users/{id}');
    expect(captureExceptionSpy).not.toHaveBeenCalled();
  });
});
