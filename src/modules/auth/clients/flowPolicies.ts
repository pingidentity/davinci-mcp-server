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
 * Client for managing and querying DaVinci flow policies.
 */
export class FlowPoliciesClient extends DaVinciApiClient {
  /**
   * Retrieves a list of all flow policies in the current environment.
   * @param applicationId - The ID of the application to which the flow policies belong.
   * @returns A promise that resolves to the list of flow policies.
   */
  async listFlowPolicies(applicationId: string) {
    const response = await this.axiosInstance.get(`/davinciApplications/${applicationId}/flowPolicies`);
    return response.data;
  }

  /**
   * Retrieves details of a single DaVinci flow policy by ID.
   *
   * @param applicationId - The ID of the application to which the flow policy belongs.
   * @param flowPolicyId - The ID of the flow policy to retrieve.
   * @returns A promise that resolves to the flow policy details.
   */
  async describeFlowPolicy(applicationId: string, flowPolicyId: string) {
    const response = await this.axiosInstance.get(`/davinciApplications/${applicationId}/flowPolicies/${flowPolicyId}`);
    return response.data;
  } 
}
