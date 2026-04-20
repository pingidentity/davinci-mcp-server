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

/**
 * Standardized logger for the MCP server.
 * All logs are written to stderr as stdout is reserved for MCP communication.
 *
 * In an stdio MCP environment:
 * - ERROR and WARN are always logged to provide visibility into failures.
 * - INFO and DEBUG are only logged when verbose mode is enabled to keep the noise down.
 */
export class Logger {
  /**
   * Creates a new Logger instance.
   *
   * @param verbose - Whether to enable verbose logging (INFO and DEBUG). Defaults to false.
   */
  constructor(private readonly verbose: boolean = false) {}

  /**
   * Logs an informational message.
   * Only logged if verbose mode is enabled.
   *
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  info(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      console.error(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Logs a warning message.
   * Always logged to stderr.
   *
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  warn(message: string, ...args: unknown[]): void {
    console.error(`[WARN] ${message}`, ...args);
  }

  /**
   * Logs an error message.
   * Always logged to stderr.
   *
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  /**
   * Logs a debug message.
   * Only logged if verbose mode is enabled.
   *
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }
}
