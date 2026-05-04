/**
 * Copyright 2026 Ping Identity Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, it, expect } from 'vitest';
import { optionalString, optionalInt, pickDefined } from '../../src/utils/schemas.js';

describe('optionalString', () => {
  const schema = optionalString('A test description');

  it('should accept a valid string', () => {
    expect(schema.parse('hello')).toBe('hello');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(schema.parse('  hello  ')).toBe('hello');
  });

  it('should reject an empty string', () => {
    expect(() => schema.parse('')).toThrow();
  });

  it('should reject a whitespace-only string after trimming', () => {
    expect(() => schema.parse('   ')).toThrow();
  });

  it('should accept undefined (optional)', () => {
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it('should attach the description', () => {
    expect(schema.description).toBe('A test description');
  });
});

describe('optionalInt', () => {
  const schema = optionalInt({ min: 1, max: 50, description: 'Page size' });

  it('should accept a valid integer within range', () => {
    expect(schema.parse(25)).toBe(25);
  });

  it('should accept the minimum boundary value', () => {
    expect(schema.parse(1)).toBe(1);
  });

  it('should accept the maximum boundary value', () => {
    expect(schema.parse(50)).toBe(50);
  });

  it('should reject a value below the minimum', () => {
    expect(() => schema.parse(0)).toThrow();
  });

  it('should reject a value above the maximum', () => {
    expect(() => schema.parse(51)).toThrow();
  });

  it('should reject a non-integer', () => {
    expect(() => schema.parse(1.5)).toThrow();
  });

  it('should accept undefined (optional)', () => {
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it('should work without min or max bounds', () => {
    const unbounded = optionalInt({ description: 'No bounds' });
    expect(unbounded.parse(9999)).toBe(9999);
    expect(unbounded.parse(undefined)).toBeUndefined();
  });

  it('should attach the description', () => {
    expect(schema.description).toBe('Page size');
  });
});

describe('pickDefined', () => {
  it('should return only keys with defined values', () => {
    expect(pickDefined({ a: 1, b: undefined, c: 'x' })).toEqual({ a: 1, c: 'x' });
  });

  it('should return undefined when all values are undefined', () => {
    expect(pickDefined({ a: undefined, b: undefined })).toBeUndefined();
  });

  it('should return undefined for an empty object', () => {
    expect(pickDefined({})).toBeUndefined();
  });

  it('should return all keys when all values are defined', () => {
    expect(pickDefined({ a: 1, b: 'two', c: true })).toEqual({ a: 1, b: 'two', c: true });
  });

  it('should handle a single defined value', () => {
    expect(pickDefined({ cursor: 'abc' })).toEqual({ cursor: 'abc' });
  });
});
