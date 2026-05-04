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

import { QueryParams } from '../../../types/index.js';
import { DaVinciApiClient } from './davinci.js';

/**
 * Client for managing and querying DaVinci variables.
 */
export class VariablesClient extends DaVinciApiClient {
  /**
   * Retrieves a list of all variables in the current environment.
   *
   * @param params - Optional query parameters.
   * @param params.limit - Maximum number of resources to return per page (1-50, default 10).
   * @param params.cursor - Opaque pagination cursor from the `next` link of a previous response.
   * @param params.filter - SCIM filter (RFC 7644 Section 3.4.2.2). Filterable
   *   attributes and supported comparison operators: `context` (eq, sw, co, ew),
   *   `name` (eq, sw, co, ew), `createdAt` and `updatedAt` (eq, gt, ge, lt, le).
   *   Clauses may be combined with the logical operators `and` / `or`.
   * @returns A promise that resolves to the list of variables.
   */
  async listVariables(params?: QueryParams) {
    const response = await this.axiosInstance.get('/variables', { params });
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
