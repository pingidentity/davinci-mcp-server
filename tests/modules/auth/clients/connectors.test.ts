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
import { ConnectorsClient } from '../../../../src/modules/auth/clients/connectors.js';
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

describe('ConnectorsClient', () => {
  let mockAuthManager: AuthManager;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let client: ConnectorsClient;
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

    client = new ConnectorsClient(mockAuthManager);
    axiosInstance = vi.mocked(axios.create).mock.results[0].value;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should call GET /connectors for listConnectors', async () => {
    const mockConnectors = [{ id: 'httpConnector', name: 'HTTP' }];
    axiosInstance.get.mockResolvedValue({ data: mockConnectors });

    const result = await client.listConnectors();

    expect(axiosInstance.get).toHaveBeenCalledWith('/connectors');
    expect(result).toEqual(mockConnectors);
  });

  it('should call GET /connectors/:connectorId for getConnector', async () => {
    const mockConnector = { id: 'httpConnector', name: 'HTTP', version: '1.0.73' };
    axiosInstance.get.mockResolvedValue({ data: mockConnector });

    const result = await client.getConnector('httpConnector');

    expect(axiosInstance.get).toHaveBeenCalledWith('/connectors/httpConnector');
    expect(result).toEqual(mockConnector);
  });

  it('should call GET /connectors/:connectorId/details for getConnectorDetails', async () => {
    const mockDetails = { capabilities: { makeRestApiCall: { title: 'Make REST API Call' } } };
    axiosInstance.get.mockResolvedValue({ data: mockDetails });

    const result = await client.getConnectorDetails('httpConnector');

    expect(axiosInstance.get).toHaveBeenCalledWith('/connectors/httpConnector/details');
    expect(result).toEqual(mockDetails);
  });

  it('should propagate errors from listConnectors', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Network error'));

    await expect(client.listConnectors()).rejects.toThrow('Network error');
  });

  it('should propagate errors from getConnector', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Not found'));

    await expect(client.getConnector('invalid-id')).rejects.toThrow('Not found');
  });

  it('should propagate errors from getConnectorDetails', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Not found'));

    await expect(client.getConnectorDetails('invalid-id')).rejects.toThrow('Not found');
  });
});
