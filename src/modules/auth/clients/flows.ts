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

import { DaVinciApiClient } from './davinci.js';

/**
 * Client for managing and querying DaVinci flows.
 */
export class FlowsClient extends DaVinciApiClient {
  /**
   * Retrieves a list of all flows in the current environment.
   *
   * @returns A promise that resolves to the list of flows.
   */
  async listFlows() {
    const response = await this.axiosInstance.get('/flows');
    return response.data;
  }

  /**
   * Retrieves details of a specific flow.
   *
   * @param flowId - The ID of the flow to retrieve.
   * @param params - Optional query parameters to specify which attributes to return and whether to expand related resources.
   * @returns A promise that resolves to the flow details.
   */
  async getFlow(flowId: string, params?: { attributes?: string; expand?: string }) {
    const response = await this.axiosInstance.get(`/flows/${flowId}`, { params });
    return response.data;
  }

  /**
   * Validates a specific flow configuration.
   *
   * @param flowId - The ID of the flow to validate.
   * @returns A promise that resolves to the validation results.
   */
  async validateFlow(flowId: string) {
    const response = await this.axiosInstance.post(
      `/flows/${flowId}`,
      {},
      {
        headers: {
          'content-type': 'application/vnd.pingidentity.flow.validate+json',
        },
      },
    );
    return response.data;
  }

  /**
   * Retrieves the execution history of a specific flow.
   *
   * @param flowId - The ID of the flow to retrieve executions for.
   * @param params - Optional query parameters to limit the number of results, paginate through results, or scim filter by timestamp and transactionId.
   * @returns A promise that resolves to the list of flow executions.
   */
  async getFlowExecutions(
    flowId: string,
    params?: { limit?: number; cursor?: string; filter?: string },
  ) {
    const response = await this.axiosInstance.get(`/flows/${flowId}/interactions`, { params });
    return response.data;
  }

  /**
   * Retrieves the execution events for a specific flow interaction.
   *
   * @param flowId - The ID of the flow.
   * @param interactionId - The ID of the interaction to retrieve events for.
   * @param params - Optional query parameters to limit the number of results, paginate through results, or scim filter by timestamp and transactionId.
   * @returns A promise that resolves to the list of flow execution events.
   */
  async getFlowExecutionEvents(
    flowId: string,
    interactionId: string,
    params?: { limit?: number; cursor?: string; filter?: string },
  ) {
    const response = await this.axiosInstance.get(
      `/flows/${flowId}/interactions/${interactionId}/events`,
      { params },
    );
    return response.data;
  }
}
