export * from './exports';

// Exports using diagnostics channels
import { attachHapiErrorHandler as _attachHapiErrorHandler } from './integrations/hapi/hapi-error-handler';

export { prismaIntegration } from './prisma';
export { bindTracingChannelToSpan } from './tracing-channel';
export type { TracingChannelPayloadWithSpan } from './tracing-channel';
export type { InstrumentationConfig } from './orchestrion';
export type { GenAiOptions } from './ai/core/utils';
export { vercelAIIntegration, type VercelAiOptions } from './vercel-ai';
export {
  fastifyIntegration,
  // oxlint-disable-next-line typescript/no-deprecated
  handleFastifyError,
  // oxlint-disable-next-line typescript/no-deprecated
  instrumentFastify,
} from './integrations/fastify';

/**
 * @deprecated This is a temporary export to avoid breaking changes. It will be removed in the next major version.
 */
export const attachHapiErrorHandler = _attachHapiErrorHandler;
