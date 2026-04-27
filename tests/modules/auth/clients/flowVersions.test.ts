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
import { FlowVersionsClient } from '../../../../src/modules/auth/clients/flowVersions.js';
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

describe('FlowVersionsClient', () => {
  let mockAuthManager: AuthManager;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let client: FlowVersionsClient;
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

    client = new FlowVersionsClient(mockAuthManager);
    axiosInstance = vi.mocked(axios.create).mock.results[0].value;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should call GET /flows/:flowId/versions for listFlowVersions', async () => {
    const mockVersions = [{ version: 1 }, { version: 2 }];
    axiosInstance.get.mockResolvedValue({ data: mockVersions });

    const result = await client.listFlowVersions('flow-123');

    expect(axiosInstance.get).toHaveBeenCalledWith('/flows/flow-123/versions');
    expect(result).toEqual(mockVersions);
  });

  it('should call GET /flows/:flowId/versions/:versionId for getFlowVersion', async () => {
    const mockVersion = { version: 3, flow: { id: 'flow-123' } };
    axiosInstance.get.mockResolvedValue({ data: mockVersion });

    const result = await client.getFlowVersion('flow-123', '3');

    expect(axiosInstance.get).toHaveBeenCalledWith('/flows/flow-123/versions/3');
    expect(result).toEqual(mockVersion);
  });

  it('should call GET /flows/:flowId/versions/:versionId/details for getFlowVersionDetails', async () => {
    const mockDetails = { nodes: [], edges: [] };
    axiosInstance.get.mockResolvedValue({ data: mockDetails });

    const result = await client.getFlowVersionDetails('flow-123', '3');

    expect(axiosInstance.get).toHaveBeenCalledWith('/flows/flow-123/versions/3/details');
    expect(result).toEqual(mockDetails);
  });

  it('should propagate errors from listFlowVersions', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Network error'));

    await expect(client.listFlowVersions('flow-123')).rejects.toThrow('Network error');
  });

  it('should propagate errors from getFlowVersion', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Not found'));

    await expect(client.getFlowVersion('invalid-id', '99')).rejects.toThrow('Not found');
  });

  it('should propagate errors from getFlowVersionDetails', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Not found'));

    await expect(client.getFlowVersionDetails('invalid-id', '99')).rejects.toThrow('Not found');
  });
});
