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
import { FlowPoliciesClient } from '../../../../src/modules/auth/clients/flowPolicies.js';
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

describe('FlowPoliciesClient', () => {
  let mockAuthManager: AuthManager;
  let client: FlowPoliciesClient;
  let axiosInstance: { get: ReturnType<typeof vi.fn> };
  let consoleSpy: ReturnType<typeof vi.fn>;

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

    client = new FlowPoliciesClient(mockAuthManager);
    axiosInstance = vi.mocked(axios.create).mock.results[0].value;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should call GET /davinciApplications/{applicationId}/flowPolicies for listFlowPolicies', async () => {
    const applicationId = 'app-123';
    const mockFlowPolicies = [{ id: 'fp-1' }, { id: 'fp-2' }];
    axiosInstance.get.mockResolvedValue({ data: mockFlowPolicies });

    const result = await client.listFlowPolicies(applicationId);

    expect(axiosInstance.get).toHaveBeenCalledWith(
      `/davinciApplications/${applicationId}/flowPolicies`,
    );
    expect(result).toEqual(mockFlowPolicies);
  });

  it('should call GET /davinciApplications/{applicationId}/flowPolicies/{flowPolicyId} for describeFlowPolicy', async () => {
    const applicationId = 'app-123';
    const flowPolicyId = 'fp-456';
    const mockFlowPolicy = { id: flowPolicyId, name: 'Test Flow Policy' };
    axiosInstance.get.mockResolvedValue({ data: mockFlowPolicy });

    const result = await client.describeFlowPolicy(applicationId, flowPolicyId);

    expect(axiosInstance.get).toHaveBeenCalledWith(
      `/davinciApplications/${applicationId}/flowPolicies/${flowPolicyId}`,
    );
    expect(result).toEqual(mockFlowPolicy);
  });

  it('should propagate errors from listFlowPolicies', async () => {
    const applicationId = 'app-123';
    axiosInstance.get.mockRejectedValue(new Error('Network error'));

    await expect(client.listFlowPolicies(applicationId)).rejects.toThrow('Network error');
  });

  it('should propagate errors from describeFlowPolicy', async () => {
    const applicationId = 'app-123';
    const flowPolicyId = 'invalid-id';
    axiosInstance.get.mockRejectedValue(new Error('Not found'));

    await expect(client.describeFlowPolicy(applicationId, flowPolicyId)).rejects.toThrow(
      'Not found',
    );
  });
});
