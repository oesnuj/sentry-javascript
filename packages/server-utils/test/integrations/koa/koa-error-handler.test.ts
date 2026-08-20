// oxlint-disable typescript/no-deprecated -- exercising the deprecated-but-internal error handler
import * as SentryCore from '@sentry/core';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { attachKoaErrorHandler, type KoaApp } from '../../../src/integrations/koa/koa-error-handler';

type ErrorListener = (error: unknown, context?: unknown) => void;

interface FakeApp {
  app: KoaApp;
  onSpy: MockInstance;
  getListener: () => ErrorListener | undefined;
}

function makeApp(): FakeApp {
  let listener: ErrorListener | undefined;
  const onSpy = vi.fn((_event: string, cb: ErrorListener) => {
    listener = cb;
  });
  const app = { on: onSpy } as unknown as KoaApp;
  return { app, onSpy, getListener: () => listener };
}

describe('attachKoaErrorHandler', () => {
  let captureExceptionSpy: MockInstance;

  beforeEach(() => {
    captureExceptionSpy = vi.spyOn(SentryCore, 'captureException').mockImplementation(() => 'id');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a single `error` listener', () => {
    const { app, onSpy } = makeApp();

    attachKoaErrorHandler(app);

    expect(onSpy).toHaveBeenCalledTimes(1);
    expect(onSpy).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('is idempotent across repeat calls on the same app', () => {
    const { app, onSpy } = makeApp();

    attachKoaErrorHandler(app);
    attachKoaErrorHandler(app);

    expect(onSpy).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the app has no `on` method', () => {
    expect(() => attachKoaErrorHandler({} as KoaApp)).not.toThrow();
    expect(() => attachKoaErrorHandler(undefined as unknown as KoaApp)).not.toThrow();
  });

  it('captures the emitted error as an unhandled koa middleware error', () => {
    const { app, getListener } = makeApp();
    attachKoaErrorHandler(app);
    const error = new Error('boom');

    getListener()?.(error);

    expect(captureExceptionSpy).toHaveBeenCalledWith(error, {
      mechanism: { type: 'auto.middleware.koa', handled: false },
    });
  });
});
