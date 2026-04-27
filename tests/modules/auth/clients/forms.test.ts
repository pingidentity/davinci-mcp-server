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
import { FormsClient } from '../../../../src/modules/auth/clients/forms.js';
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

describe('FormsClient', () => {
  let mockAuthManager: AuthManager;
  let client: FormsClient;
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

    client = new FormsClient(mockAuthManager);
    axiosInstance = vi.mocked(axios.create).mock.results[0].value;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should call GET /forms for listForms', async () => {
    const mockForms = [{ id: '1', name: 'Form 1' }];
    axiosInstance.get.mockResolvedValue({ data: mockForms });

    const result = await client.listForms();

    expect(axiosInstance.get).toHaveBeenCalledWith('/forms');
    expect(result).toEqual(mockForms);
  });

  it('should call GET /forms/{formId} for describeForm', async () => {
    const formId = 'form-123';
    const mockForm = { id: formId, name: 'Test Form' };
    axiosInstance.get.mockResolvedValue({ data: mockForm });

    const result = await client.describeForm(formId);

    expect(axiosInstance.get).toHaveBeenCalledWith(`/forms/${formId}`);
    expect(result).toEqual(mockForm);
  });

  it('should propagate errors from listForms', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Network error'));

    await expect(client.listForms()).rejects.toThrow('Network error');
  });

  it('should propagate errors from describeForm', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Not found'));

    await expect(client.describeForm('invalid-id')).rejects.toThrow('Not found');
  });
});