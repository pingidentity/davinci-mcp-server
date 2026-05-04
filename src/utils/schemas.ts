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
  flowPolicyId: 'The ID of the flow policy',
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

/**
 * Creates an optional, trimmed non-empty string Zod schema with a description.
 *
 * Leading and trailing whitespace is stripped before validation, so the value
 * seen by the tool handler is already trimmed (e.g. `"  hello  "` → `"hello"`).
 *
 * Intended for optional query-string parameters (e.g. `attributes`, `expand`,
 * `cursor`, `filter`). The description is required so each call site documents
 * the parameter's meaning and (where relevant) accepted values.
 *
 * @param description - Human-readable description attached to the Zod schema.
 */
export const optionalString = (description: string) =>
  z.string().trim().min(1).optional().describe(description);

/**
 * Creates an optional integer Zod schema with a description.
 *
 * Intended for bounded numeric query parameters (e.g. `limit`).
 *
 * @param params - Configuration object.
 * @param params.min - Optional inclusive lower bound.
 * @param params.max - Optional inclusive upper bound.
 * @param params.description - Human-readable description attached to the Zod schema.
 */
export const optionalInt = ({
  min,
  max,
  description,
}: {
  min?: number;
  max?: number;
  description: string;
}) => {
  let schema = z.number().int();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  return schema.optional().describe(description);
};

/**
 * Returns a shallow copy of `input` containing only the keys whose values
 * are not `undefined`, or `undefined` if no such keys remain.
 *
 * The return type drops `undefined` from each property's value type, so the
 * result is directly usable where an index-signature type (e.g. `QueryParams`)
 * is expected.
 *
 * Intended for building axios `params` objects from tool inputs where each
 * field is optional and should only be sent when the caller provided it.
 *
 * @param input - Object whose values may be `undefined`.
 */
export const pickDefined = <V>(
  input: Record<string, V | undefined>,
): Record<string, V> | undefined => {
  const result: Record<string, V> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
};
