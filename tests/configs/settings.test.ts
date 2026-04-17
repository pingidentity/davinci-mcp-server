import { describe, it, expect } from 'vitest';
import { createToolFilter } from '../../src/configs/settings.js';
import { TOOL_NAMES, COLLECTION_NAMES } from '../../src/utils/constants.js';
import type { ToolName } from '../../src/utils/constants.js';

describe('createToolFilter', () => {
  it('should include all tools when no filters are set', () => {
    const filter = createToolFilter({});
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(true);
  });

  it('should include all tools when config is undefined', () => {
    const filter = createToolFilter();
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(true);
  });

  // --- includeTools ---

  it('should include only tools listed in includeTools', () => {
    const filter = createToolFilter({
      includeTools: ['hello_world'],
    });
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(true);
    expect(filter('nonexistent_tool' as ToolName)).toBe(false);
  });

  it('should exclude tool not in includeTools', () => {
    const filter = createToolFilter({
      includeTools: ['some_other_tool'],
    });
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(false);
  });

  // --- excludeTools ---

  it('should exclude only tools listed in excludeTools', () => {
    const filter = createToolFilter({
      excludeTools: ['hello_world'],
    });
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(false);
  });

  it('should include tools not in excludeTools', () => {
    const filter = createToolFilter({
      excludeTools: ['some_other_tool'],
    });
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(true);
  });

  // --- includeTools takes precedence over excludeTools ---

  it('should give includeTools precedence over excludeTools', () => {
    const filter = createToolFilter({
      includeTools: ['hello_world'],
      excludeTools: ['hello_world'],
    });
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(true);
    expect(filter('nonexistent_tool' as ToolName)).toBe(false);
  });

  // --- includeCollections ---

  it('should include tools belonging to included collections', () => {
    const filter = createToolFilter({
      includeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
    });
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(true);
  });

  it('should exclude tools not in included collections', () => {
    const filter = createToolFilter({
      includeCollections: ['nonexistent_collection'],
    });
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(false);
  });

  // --- excludeCollections ---

  it('should exclude tools belonging to excluded collections', () => {
    const filter = createToolFilter({
      excludeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
    });
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(false);
  });

  // --- includeCollections takes precedence over excludeCollections ---

  it('should give includeCollections precedence over excludeCollections', () => {
    const filter = createToolFilter({
      includeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
      excludeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
    });
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(true);
  });

  // --- Combined: collection + tool filters ---

  it('should apply both collection and tool filters together', () => {
    const filter = createToolFilter({
      includeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
      includeTools: ['hello_world'],
    });
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(true);
    expect(filter('nonexistent_tool' as ToolName)).toBe(false);
  });

  it('should reject tool that passes collection filter but fails tool filter', () => {
    const filter = createToolFilter({
      includeCollections: [COLLECTION_NAMES.DAVINCI_ADMIN],
      excludeTools: ['hello_world'],
    });
    expect(filter(TOOL_NAMES.HELLO_WORLD_TOOL)).toBe(false);
  });
});
