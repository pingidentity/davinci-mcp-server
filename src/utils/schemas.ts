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

import { z } from 'zod';

/**
 * Reusable parameter descriptions for MCP tool input schemas,
 * keyed by field name for automatic lookup by {@link requiredId}.
 */
const PARAM_DESCRIPTIONS: Record<string, string> = {
  flowId: 'The ID of the flow',
  versionId: 'The ID of the flow version',
  connectorId: 'The ID of the connector',
  instanceId: 'The ID of the connector instance',
  applicationId: 'The ID of the application',
  variableId: 'The ID of the variable',
  formId: 'The ID of the form',
};

/**
 * Creates a required, trimmed string Zod schema with a description.
 *
 * @param field - The field name used in the validation error message
 *   and as a lookup key in {@link PARAM_DESCRIPTIONS}.
 * @param description - Optional override. Defaults to the value in
 *   {@link PARAM_DESCRIPTIONS} for the given field.
 */
export const requiredId = (field: string, description?: string) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required`)
    .regex(/^[a-zA-Z0-9_-]+$/, `${field} contains invalid characters`)
    .describe(description ?? PARAM_DESCRIPTIONS[field] ?? field);
