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
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let client: FlowsClient;
  let axiosInstance: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

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

    client = new FlowsClient(mockAuthManager);
    axiosInstance = vi.mocked(axios.create).mock.results[0].value;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should call GET /flows for listFlows', async () => {
    const mockFlows = [{ id: '1' }];
    axiosInstance.get.mockResolvedValue({ data: mockFlows });

    const result = await client.listFlows();

    expect(axiosInstance.get).toHaveBeenCalledWith('/flows');
    expect(result).toEqual(mockFlows);
  });

  it('should call GET /flows/:flowId for getFlow', async () => {
    const mockFlow = { id: 'flow-123', name: 'Test Flow' };
    axiosInstance.get.mockResolvedValue({ data: mockFlow });

    const result = await client.getFlow('flow-123');

    expect(axiosInstance.get).toHaveBeenCalledWith('/flows/flow-123', { params: undefined });
    expect(result).toEqual(mockFlow);
  });

  it('should call GET /flows/:flowId with params for getFlow', async () => {
    const mockFlow = { id: 'flow-123', name: 'Test Flow' };
    axiosInstance.get.mockResolvedValue({ data: mockFlow });

    const result = await client.getFlow('flow-123', {
      attributes: 'name,enabled',
      expand: 'nodes',
    });

    expect(axiosInstance.get).toHaveBeenCalledWith('/flows/flow-123', {
      params: { attributes: 'name,enabled', expand: 'nodes' },
    });
    expect(result).toEqual(mockFlow);
  });

  it('should propagate errors from listFlows', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Network error'));

    await expect(client.listFlows()).rejects.toThrow('Network error');
  });

  it('should propagate errors from getFlow', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Not found'));

    await expect(client.getFlow('invalid-id')).rejects.toThrow('Not found');
  });

  it('should call POST /flows/:flowId for validateFlow', async () => {
    const mockValidationResult = {
      flowId: 'flow-123',
      graphData: { nodes: [], edges: [] },
      dvlinterErrorCount: 2,
    };
    axiosInstance.post.mockResolvedValue({ data: mockValidationResult });

    const result = await client.validateFlow('flow-123');

    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/flows/flow-123',
      {},
      {
        headers: {
          'content-type': 'application/vnd.pingidentity.flow.validate+json',
        },
      },
    );
    expect(result).toEqual(mockValidationResult);
  });

  it('should propagate errors from validateFlow', async () => {
    axiosInstance.post.mockRejectedValue(new Error('Validation failed'));

    await expect(client.validateFlow('invalid-id')).rejects.toThrow('Validation failed');
  });

  it('should call GET /flows/:flowId/interactions for getFlowExecutions', async () => {
    const mockExecutions = [
      { id: 'exec-1', flowId: 'flow-123', timestamp: '2026-04-30T10:00:00Z' },
      { id: 'exec-2', flowId: 'flow-123', timestamp: '2026-04-30T11:00:00Z' },
    ];
    axiosInstance.get.mockResolvedValue({ data: mockExecutions });

    const result = await client.getFlowExecutions('flow-123');

    expect(axiosInstance.get).toHaveBeenCalledWith('/flows/flow-123/interactions', {
      params: undefined,
    });
    expect(result).toEqual(mockExecutions);
  });

  it('should call GET /flows/:flowId/interactions with params for getFlowExecutions', async () => {
    const mockExecutions = [{ id: 'exec-1', flowId: 'flow-123' }];
    axiosInstance.get.mockResolvedValue({ data: mockExecutions });

    const result = await client.getFlowExecutions('flow-123', {
      limit: 100,
      cursor: 'next-page-cursor',
      filter: 'timestamp ge "2026-04-01T00:00:00Z" and transactionId eq "txn-123"',
    });

    expect(axiosInstance.get).toHaveBeenCalledWith('/flows/flow-123/interactions', {
      params: {
        limit: 100,
        cursor: 'next-page-cursor',
        filter: 'timestamp ge "2026-04-01T00:00:00Z" and transactionId eq "txn-123"',
      },
    });
    expect(result).toEqual(mockExecutions);
  });

  it('should propagate errors from getFlowExecutions', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Failed to retrieve executions'));

    await expect(client.getFlowExecutions('invalid-id')).rejects.toThrow(
      'Failed to retrieve executions',
    );
  });

  it('should call GET /flows/:flowId/interactions/:interactionId/events for getFlowExecutionEvents', async () => {
    const mockEvents = [
      { id: 'event-1', type: 'start', timestamp: '2026-04-30T10:00:00Z' },
      { id: 'event-2', type: 'end', timestamp: '2026-04-30T10:00:05Z' },
    ];
    axiosInstance.get.mockResolvedValue({ data: mockEvents });

    const result = await client.getFlowExecutionEvents('flow-123', 'interaction-456');

    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/flows/flow-123/interactions/interaction-456/events',
      { params: undefined },
    );
    expect(result).toEqual(mockEvents);
  });

  it('should call GET /flows/:flowId/interactions/:interactionId/events with params for getFlowExecutionEvents', async () => {
    const mockEvents = [{ id: 'event-1', type: 'start' }];
    axiosInstance.get.mockResolvedValue({ data: mockEvents });

    const result = await client.getFlowExecutionEvents('flow-123', 'interaction-456', {
      limit: 50,
      cursor: 'events-cursor',
      filter: 'timestamp ge "2026-04-01T00:00:00Z"',
    });

    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/flows/flow-123/interactions/interaction-456/events',
      {
        params: {
          limit: 50,
          cursor: 'events-cursor',
          filter: 'timestamp ge "2026-04-01T00:00:00Z"',
        },
      },
    );
    expect(result).toEqual(mockEvents);
  });

  it('should propagate errors from getFlowExecutionEvents', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Failed to retrieve events'));

    await expect(
      client.getFlowExecutionEvents('invalid-flow-id', 'invalid-interaction-id'),
    ).rejects.toThrow('Failed to retrieve events');
  });
});
