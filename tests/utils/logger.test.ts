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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../src/utils/logger.js';

describe('Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('printCliOutput', () => {
    it('should print to stdout using console.log', () => {
      const logger = new Logger();
      logger.printCliOutput('test message', { foo: 'bar' });
      expect(console.log).toHaveBeenCalledWith('test message', { foo: 'bar' });
    });
  });

  describe('info', () => {
    it('should log to stderr when verbose is true', () => {
      const logger = new Logger(true);
      logger.info('info message');
      expect(console.error).toHaveBeenCalledWith('[INFO] info message');
    });

    it('should not log when verbose is false', () => {
      const logger = new Logger(false);
      logger.info('info message');
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should always log to stderr', () => {
      const logger = new Logger(false);
      logger.warn('warn message');
      expect(console.error).toHaveBeenCalledWith('[WARN] warn message');
    });
  });

  describe('error', () => {
    it('should always log to stderr', () => {
      const logger = new Logger(false);
      logger.error('error message');
      expect(console.error).toHaveBeenCalledWith('[ERROR] error message');
    });
  });

  describe('debug', () => {
    it('should log to stderr when verbose is true', () => {
      const logger = new Logger(true);
      logger.debug('debug message');
      expect(console.error).toHaveBeenCalledWith('[DEBUG] debug message');
    });

    it('should not log when verbose is false', () => {
      const logger = new Logger(false);
      logger.debug('debug message');
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
