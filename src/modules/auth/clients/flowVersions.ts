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
 * Client for managing and querying DaVinci flow versions.
 */
export class FlowVersionsClient extends DaVinciApiClient {
  /**
   * Retrieves a list of all versions of a flow in the current environment.
   *
   * @param flowId - The ID of the flow to list versions for.
   * @returns A promise that resolves to the list of flow versions.
   */
  async listFlowVersions(flowId: string) {
    const response = await this.axiosInstance.get(`/flows/${flowId}/versions`);
    return response.data;
  }

  /**
   * Retrieves metadata of a specific version of a flow.
   *
   * @param flowId - The ID of the flow.
   * @param versionId - The ID of the version to retrieve.
   * @returns A promise that resolves to the flow version metadata.
   */
  async getFlowVersion(flowId: string, versionId: string) {
    const response = await this.axiosInstance.get(`/flows/${flowId}/versions/${versionId}`);
    return response.data;
  }

  /**
   * Retrieves the full details of a specific flow version, including
   * the node graph, edges, and settings.
   *
   * @param flowId - The ID of the flow.
   * @param versionId - The ID of the version to retrieve details for.
   * @returns A promise that resolves to the flow version details.
   */
  async getFlowVersionDetails(flowId: string, versionId: string) {
    const response = await this.axiosInstance.get(`/flows/${flowId}/versions/${versionId}/details`);
    return response.data;
  }
}
