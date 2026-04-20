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

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { AuthManager } from '../manager.js';
import { Logger } from '../../../utils/logger.js';

interface RetryableAxiosConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

/**
 * Base client for interacting with PingOne DaVinci APIs.
 *
 * Provides an authenticated Axios instance with request and response interceptors
 * for logging and automatic token management (including login triggers).
 */
export class DaVinciApiClient {
  protected axiosInstance: AxiosInstance;
  protected authManager: AuthManager;
  protected logger: Logger;

  /**
   * Creates a new instance of DaVinciApiClient.
   *
   * @param authManager - The {@link AuthManager} to use for obtaining authentication tokens.
   */
  constructor(authManager: AuthManager) {
    this.authManager = authManager;
    this.logger = this.authManager.getLogger();

    const rootDomain = this.authManager.getRootDomain();
    const environmentId = this.authManager.getEnvironmentId();

    const apiBaseUrl = `https://api.${rootDomain}/v1/environments/${environmentId}`;

    this.axiosInstance = axios.create({
      baseURL: apiBaseUrl,
    });

    this.axiosInstance.interceptors.request.use(async (config) => {
      this.logger.debug(
        `[DaVinciApiClient] Request: ${config.method?.toUpperCase()} ${config.url}`,
      );
      if (config.data) {
        const dataStr = JSON.stringify(config.data);
        const truncated = dataStr.length > 500 ? dataStr.substring(0, 500) + '...' : dataStr;
        this.logger.debug(`[DaVinciApiClient] Request Data: ${truncated}`);
      }

      let tokens = await this.authManager.getTokens();

      if (!tokens) {
        try {
          this.logger.debug('[DaVinciApiClient] No tokens found, initiating login...');
          tokens = await this.authManager.login();
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      if (!tokens) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'No authentication tokens found and login failed.',
        );
      }

      config.headers.Authorization = `Bearer ${tokens.access_token}`;
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`[DaVinciApiClient] Response: ${response.status} ${response.config.url}`);
        if (response.data) {
          const dataStr = JSON.stringify(response.data);
          const truncated = dataStr.length > 500 ? dataStr.substring(0, 500) + '...' : dataStr;
          this.logger.debug(`[DaVinciApiClient] Response Data: ${truncated}`);
        }
        return response;
      },
      async (error) => {
        this.logger.debug(
          `[DaVinciApiClient] Error response: ${error.response?.status} ${error.config?.url}`,
        );
        if (error.response?.data) {
          this.logger.debug(
            `[DaVinciApiClient] Error Data: ${JSON.stringify(error.response.data)}`,
          );
        }

        if (error.response?.status === 401 && !(error.config as RetryableAxiosConfig)?._retried) {
          this.logger.debug('[DaVinciApiClient] Received 401, attempting re-authentication...');
          try {
            const tokens = await this.authManager.login();
            const retryConfig = error.config as RetryableAxiosConfig;
            retryConfig._retried = true;
            retryConfig.headers.Authorization = `Bearer ${tokens.access_token}`;
            return this.axiosInstance.request(retryConfig);
          } catch (loginError) {
            this.logger.error('[DaVinciApiClient] Re-authentication failed:', loginError);
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      },
    );
  }
}
