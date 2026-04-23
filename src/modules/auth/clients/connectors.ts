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
 * Client for querying the DaVinci connector catalog.
 */
export class ConnectorsClient extends DaVinciApiClient {
  /**
   * Retrieves a list of all available connectors from the catalog.
   *
   * @returns A promise that resolves to the list of connectors.
   */
  async listConnectors() {
    const response = await this.axiosInstance.get('/connectors');
    return response.data;
  }

  /**
   * Retrieves metadata of a specific connector.
   *
   * @param connectorId - The ID of the connector to retrieve.
   * @returns A promise that resolves to the connector metadata.
   */
  async getConnector(connectorId: string) {
    const response = await this.axiosInstance.get(`/connectors/${connectorId}`);
    return response.data;
  }

  /**
   * Retrieves the full details of a specific connector, including
   * capabilities, configurable properties, and required credentials.
   *
   * @param connectorId - The ID of the connector to retrieve details for.
   * @returns A promise that resolves to the connector details.
   */
  async getConnectorDetails(connectorId: string) {
    const response = await this.axiosInstance.get(`/connectors/${connectorId}/details`);
    return response.data;
  }
}
