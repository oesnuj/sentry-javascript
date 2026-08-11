import type { Integration } from '@sentry/core';
import { vercelAIIntegration } from './integrations/tracing/vercelai';
import { getBaseDefaultIntegrations, initWithDefaultIntegrations } from './baseSdk';
import type { CloudflareClient, CloudflareOptions } from './client';
import { setupOpenTelemetryTracer } from './opentelemetry/tracer';

/**
 * Get the default integrations for the Cloudflare SDK.
 *
 * This is the full set and requires the `nodejs_compat` compatibility flag. Runtimes that cannot
 * enable it (e.g. Shopify Oxygen) go through `wrapRequestHandler`, which only sets up
 * `getBaseDefaultIntegrations`.
 */
export function getDefaultIntegrations(options: CloudflareOptions): Integration[] {
  return [
    ...getBaseDefaultIntegrations(options),
    // Subscribes to the `ai` SDK's native `node:diagnostics_channel` telemetry channel.
    vercelAIIntegration(),
  ];
}

/**
 * Initializes the cloudflare SDK.
 */
export function init(options: CloudflareOptions): CloudflareClient | undefined {
  // Like most Node-based SDKs, Cloudflare defaults to running without a Sentry OpenTelemetry tracer
  // provider. Scope isolation is handled by the entrypoint wrappers' AsyncLocalStorage strategy.
  options.enableOpenTelemetrySetup ??= false;

  // Opt-in only: when `enableOpenTelemetrySetup` is `true`, set up a custom trace provider so spans
  // emitted via `@opentelemetry/api` are captured by Sentry. See the option's docs for the caveats.
  if (options.enableOpenTelemetrySetup) {
    setupOpenTelemetryTracer();
  }

  return initWithDefaultIntegrations(options, getDefaultIntegrations);
}
