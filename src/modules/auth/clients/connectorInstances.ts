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
 * Client for querying deployed DaVinci connector instances.
 */
export class ConnectorInstancesClient extends DaVinciApiClient {
  /**
   * Retrieves a list of all deployed connector instances in the environment.
   *
   * @returns A promise that resolves to the list of connector instances.
   */
  async listConnectorInstances() {
    const response = await this.axiosInstance.get('/connectorInstances');
    return response.data;
  }

  /**
   * Retrieves details of a specific connector instance.
   *
   * @param instanceId - The ID of the connector instance to retrieve.
   * @returns A promise that resolves to the connector instance details.
   */
  async getConnectorInstance(instanceId: string) {
    const response = await this.axiosInstance.get(`/connectorInstances/${instanceId}`);
    return response.data;
  }
}
