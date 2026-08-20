import { addNonEnumerableProperty, captureException } from '@sentry/core';

// Marks a koa app as already carrying the Sentry error listener, so repeat
// attachments only ever register a single listener — whether reached via the
// `callback` channel or a lingering manual `setupKoaErrorHandler` call.
const ERROR_HANDLER_ATTACHED = '__SENTRY_KOA_ERROR_HANDLER_ATTACHED__';

/** The subset of a koa `Application` the error handler needs (it extends `EventEmitter`). */
export interface KoaApp {
  on(event: 'error', listener: (error: unknown, context?: unknown) => void): unknown;
  [key: string]: unknown;
}

type MarkedKoaApp = KoaApp & { [ERROR_HANDLER_ATTACHED]?: boolean };

/**
 * Attach a Sentry error listener to a koa app's `error` event.
 *
 * Koa emits `'error'` for every request error that bubbles up unhandled, so a
 * single `app.on('error')` listener captures the same errors a top-level
 * try/catch middleware would — without depending on middleware order.
 *
 * Idempotent — the app is marked so auto-registration (via the `callback`
 * channel) and any explicit `setupKoaErrorHandler` call never stack up multiple
 * listeners.
 *
 * @deprecated Internal. The error handler is registered automatically by the koa
 * instrumentation; there is no need to call this directly. It is exported only
 * so the deprecated `setupKoaErrorHandler` can delegate to it, and will be
 * removed in a future major version.
 */
export function attachKoaErrorHandler(app: KoaApp): void {
  const markedApp = app as MarkedKoaApp;
  if (!markedApp || typeof markedApp.on !== 'function' || markedApp[ERROR_HANDLER_ATTACHED]) {
    return;
  }
  addNonEnumerableProperty(markedApp, ERROR_HANDLER_ATTACHED, true);

  markedApp.on('error', (error: unknown) => {
    captureException(error, {
      mechanism: {
        type: 'auto.middleware.koa',
        handled: false,
      },
    });
  });
}
