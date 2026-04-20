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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { DaVinciApiClient } from '../../../../src/modules/auth/clients/davinci.js';
import { AuthManager } from '../../../../src/modules/auth/manager.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InterceptorFn = (...args: any[]) => any;

vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn().mockReturnValue({
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn() },
          response: { use: vi.fn(), eject: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
        request: vi.fn(),
      }),
    },
  };
});

describe('DaVinciApiClient', () => {
  let mockAuthManager: AuthManager;
  let requestInterceptor: InterceptorFn;
  let responseSuccessInterceptor: InterceptorFn;
  let responseErrorInterceptor: InterceptorFn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthManager = {
      getTokens: vi
        .fn()
        .mockResolvedValue({ access_token: 'test-token', expires_at: Date.now() + 3600000 }),
      login: vi
        .fn()
        .mockResolvedValue({ access_token: 'new-token', expires_at: Date.now() + 3600000 }),
      getLogger: vi.fn().mockReturnValue({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      }),
      getRootDomain: vi.fn().mockReturnValue('pingidentity.com'),
      getEnvironmentId: vi.fn().mockReturnValue('test-env-id'),
    } as unknown as AuthManager;

    new DaVinciApiClient(mockAuthManager);

    mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value;
    requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
    responseSuccessInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
    responseErrorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
  });

  it('should initialize with correct base URL', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://api.pingidentity.com/v1/environments/test-env-id',
    });
  });

  it('should add request and response interceptors', () => {
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
  });

  describe('Request Interceptor', () => {
    it('should add Bearer token from existing tokens', async () => {
      const mockConfig = { headers: { Authorization: '' }, method: 'get', url: '/flows' };
      const result = await requestInterceptor(mockConfig);
      expect(result.headers.Authorization).toBe('Bearer test-token');
      expect(mockAuthManager.getTokens).toHaveBeenCalled();
    });

    it('should trigger login when no tokens exist', async () => {
      vi.mocked(mockAuthManager.getTokens).mockResolvedValue(null);
      const mockConfig = { headers: { Authorization: '' }, method: 'get', url: '/flows' };
      const result = await requestInterceptor(mockConfig);
      expect(mockAuthManager.login).toHaveBeenCalled();
      expect(result.headers.Authorization).toBe('Bearer new-token');
    });

    it('should throw McpError when login fails', async () => {
      vi.mocked(mockAuthManager.getTokens).mockResolvedValue(null);
      vi.mocked(mockAuthManager.login).mockRejectedValue(new Error('login failed'));
      const mockConfig = { headers: { Authorization: '' }, method: 'get', url: '/flows' };
      await expect(requestInterceptor(mockConfig)).rejects.toThrow(McpError);
    });

    it('should throw McpError when login returns null', async () => {
      vi.mocked(mockAuthManager.getTokens).mockResolvedValue(null);
      vi.mocked(mockAuthManager.login).mockResolvedValue(null as never);
      const mockConfig = { headers: { Authorization: '' }, method: 'get', url: '/flows' };
      await expect(requestInterceptor(mockConfig)).rejects.toThrow(
        'No authentication tokens found',
      );
    });
  });

  describe('Response Interceptor', () => {
    it('should pass through successful responses', () => {
      const response = { status: 200, config: { url: '/flows' }, data: { flows: [] } };
      const result = responseSuccessInterceptor(response);
      expect(result).toBe(response);
    });

    it('should retry once on 401 with re-authenticated tokens', async () => {
      const retryResponse = { status: 200, data: { flows: [] } };
      mockAxiosInstance.request.mockResolvedValue(retryResponse);

      vi.mocked(mockAuthManager.login).mockResolvedValue({
        access_token: 'new-token',
        expires_at: Date.now() + 3600000,
      });

      const error = {
        response: { status: 401, data: null },
        config: { url: '/flows', headers: { Authorization: '' } },
      };

      const result = await responseErrorInterceptor(error);
      expect(mockAuthManager.login).toHaveBeenCalled();
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ _retried: true }),
      );
      expect(result).toBe(retryResponse);
    });

    it('should not retry if already retried', async () => {
      const error = {
        response: { status: 401, data: null },
        config: { url: '/flows', headers: { Authorization: '' }, _retried: true },
      };

      await expect(responseErrorInterceptor(error)).rejects.toBe(error);
      expect(mockAuthManager.login).not.toHaveBeenCalled();
    });

    it('should reject original error when re-auth fails', async () => {
      vi.mocked(mockAuthManager.login).mockRejectedValue(new Error('re-auth failed'));

      const error = {
        response: { status: 401, data: null },
        config: { url: '/flows', headers: { Authorization: '' } },
      };

      await expect(responseErrorInterceptor(error)).rejects.toBe(error);
    });

    it('should pass through non-401 errors', async () => {
      const error = {
        response: { status: 500, data: { message: 'server error' } },
        config: { url: '/flows' },
      };

      await expect(responseErrorInterceptor(error)).rejects.toBe(error);
      expect(mockAuthManager.login).not.toHaveBeenCalled();
    });
  });
});
