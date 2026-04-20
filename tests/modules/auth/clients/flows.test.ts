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
import { FlowsClient } from '../../../../src/modules/auth/clients/flows.js';
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

describe('FlowsClient', () => {
  let mockAuthManager: AuthManager;
  let client: FlowsClient;
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

    client = new FlowsClient(mockAuthManager);
    axiosInstance = vi.mocked(axios.create).mock.results[0].value;
  });

  it('should call GET /flows for listFlows', async () => {
    const mockFlows = [{ id: '1' }];
    axiosInstance.get.mockResolvedValue({ data: mockFlows });

    const result = await client.listFlows();

    expect(axiosInstance.get).toHaveBeenCalledWith('/flows');
    expect(result).toEqual(mockFlows);
  });
});
