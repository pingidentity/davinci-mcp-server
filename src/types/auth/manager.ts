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

/**
 * Represents the OAuth 2.0 tokens returned from the token endpoint.
 */
export interface Tokens {
  /** The access token used for API requests. */
  access_token: string;
  /** The timestamp (in milliseconds) when the access token expires. */
  expires_at: number;
}

/**
 * Configuration for the AuthManager.
 */
export interface AuthConfig {
  /** The OAuth 2.0 client ID for the authorization code flow. */
  clientId: string;
  /** The PingOne environment ID. */
  environmentId: string;
  /** The root domain for PingOne services (e.g., "pingone.com"). */
  rootDomain: string;
  /** Optional custom domain for authentication. */
  customDomain?: string;
}
