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
import axios from 'axios';
import { ConnectorInstancesClient } from '../../../../src/modules/auth/clients/connectorInstances.js';
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

describe('ConnectorInstancesClient', () => {
  let mockAuthManager: AuthManager;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let client: ConnectorInstancesClient;
  let axiosInstance: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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

    client = new ConnectorInstancesClient(mockAuthManager);
    axiosInstance = vi.mocked(axios.create).mock.results[0].value;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should call GET /connectorInstances for listConnectorInstances', async () => {
    const mockInstances = [{ id: 'instance-1', name: 'Http' }];
    axiosInstance.get.mockResolvedValue({ data: mockInstances });

    const result = await client.listConnectorInstances();

    expect(axiosInstance.get).toHaveBeenCalledWith('/connectorInstances');
    expect(result).toEqual(mockInstances);
  });

  it('should call GET /connectorInstances/:instanceId for getConnectorInstance', async () => {
    const mockInstance = { id: 'abc123', name: 'Functions', connector: { id: 'functionsConnector' } };
    axiosInstance.get.mockResolvedValue({ data: mockInstance });

    const result = await client.getConnectorInstance('abc123');

    expect(axiosInstance.get).toHaveBeenCalledWith('/connectorInstances/abc123');
    expect(result).toEqual(mockInstance);
  });

  it('should propagate errors from listConnectorInstances', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Network error'));

    await expect(client.listConnectorInstances()).rejects.toThrow('Network error');
  });

  it('should propagate errors from getConnectorInstance', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Not found'));

    await expect(client.getConnectorInstance('invalid-id')).rejects.toThrow('Not found');
  });
});
