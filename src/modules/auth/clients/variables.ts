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
 * Client for managing and querying DaVinci variables.
 */
export class VariablesClient extends DaVinciApiClient {
  /**
   * Retrieves a list of all variables in the current environment.
   *
   * @returns A promise that resolves to the list of variables.
   */
  async listVariables() {
    const response = await this.axiosInstance.get('/variables');
    return response.data;
  }

  /**
   * Retrieves details of a single DaVinci variable by ID.
   *
   * @param variableId - The ID of the variable to retrieve.
   * @returns A promise that resolves to the variable details.
   */
  async describeVariable(variableId: string) {
    const response = await this.axiosInstance.get(`/variables/${variableId}`);
    return response.data;
  } 
}