import { GLOBAL_OBJ } from '@sentry/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getOrchestrionInjectedModules, isOrchestrionInjected } from '../../src/orchestrion/detect';

describe('isOrchestrionInjected', () => {
  beforeEach(() => {
    delete GLOBAL_OBJ.__SENTRY_ORCHESTRION__;
  });

  afterEach(() => {
    delete GLOBAL_OBJ.__SENTRY_ORCHESTRION__;
  });

  it('is false when no marker exists', () => {
    expect(isOrchestrionInjected()).toBe(false);
  });

  it.each([
    ['runtime', { runtime: [] }],
    ['bundler set', { bundler: new Set(['mysql']) }],
    ['bundler empty set', { bundler: new Set() }],
    ['bundler true', { bundler: true }],
    ['integrations', { integrations: new Map() }],
  ] as const)('is true when %s injection is present', (_label, marker) => {
    // Cast through `unknown`: rows are `as const` (readonly) and `bundler: true`
    // is a legacy runtime shape the marker type no longer spells out.
    GLOBAL_OBJ.__SENTRY_ORCHESTRION__ = marker as unknown as typeof GLOBAL_OBJ.__SENTRY_ORCHESTRION__;
    expect(isOrchestrionInjected()).toBe(true);
  });
});

describe('getOrchestrionInjectedModules', () => {
  beforeEach(() => {
    delete GLOBAL_OBJ.__SENTRY_ORCHESTRION__;
  });

  afterEach(() => {
    delete GLOBAL_OBJ.__SENTRY_ORCHESTRION__;
  });

  it('is empty when no marker exists', () => {
    expect(getOrchestrionInjectedModules()).toEqual([]);
  });

  it('merges the runtime list and the bundler set', () => {
    GLOBAL_OBJ.__SENTRY_ORCHESTRION__ = { runtime: ['pg'], bundler: new Set(['mysql']) };
    expect(getOrchestrionInjectedModules()).toEqual(['pg', 'mysql']);
  });

  it('ignores a foreign non-Set bundler flag', () => {
    GLOBAL_OBJ.__SENTRY_ORCHESTRION__ = { runtime: ['pg'], bundler: true as unknown as Set<string> };
    expect(getOrchestrionInjectedModules()).toEqual(['pg']);
  });
});
