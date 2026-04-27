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
import { VariablesClient } from '../../../../src/modules/auth/clients/variables.js';
import { AuthManager } from '../../../../src/modules/auth/manager.js';

vi.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
  };
  return {
    default: {
      create: vi.fn().mockReturnValue(mockAxiosInstance),
    },
  };
});

describe('VariablesClient', () => {
  let mockAuthManager: AuthManager;
  let client: VariablesClient;
  let axiosInstance: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthManager = {
      getTokens: vi.fn().mockResolvedValue({ access_token: 'test-token' }),
      getLogger: vi.fn().mockReturnValue({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      }),
      getRootDomain: vi.fn().mockReturnValue('pingidentity.com'),
      getEnvironmentId: vi.fn().mockReturnValue('test-env-id'),
    } as unknown as AuthManager;

    client = new VariablesClient(mockAuthManager);
    axiosInstance = vi.mocked(axios.create).mock.results[0].value;
  });

  it('should call GET /variables for listVariables', async () => {
    const mockVariables = [{ id: '1' }];
    axiosInstance.get.mockResolvedValue({ data: mockVariables });

    const result = await client.listVariables();

    expect(axiosInstance.get).toHaveBeenCalledWith('/variables');
    expect(result).toEqual(mockVariables);
  });

  it('should call GET /variables/{variableId} for describeVariable', async () => {
    const mockVariable = { id: '1', name: 'test-var' };
    axiosInstance.get.mockResolvedValue({ data: mockVariable });

    const result = await client.describeVariable('1');

    expect(axiosInstance.get).toHaveBeenCalledWith('/variables/1');
    expect(result).toEqual(mockVariable);
  });

  it('should propagate errors from listVariables', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Network error'));

    await expect(client.listVariables()).rejects.toThrow('Network error');
  });

  it('should propagate errors from describeVariable', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Not found'));

    await expect(client.describeVariable('invalid-id')).rejects.toThrow('Not found');
  });
});
