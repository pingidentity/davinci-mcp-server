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

import axios from 'axios';
import keytar from 'keytar';
import open from 'open';
import { createServer } from 'http';
import crypto from 'crypto';
import { Tokens, AuthConfig } from '../../types/auth/manager.js';
import * as constants from '../../utils/constants.js';
import { Logger } from '../../utils/logger.js';
import { getAuthResultHtml } from '../../configs/html.js';

/**
 * Manages OAuth 2.0 Authorization Code flow with PKCE for authenticating with PingOne DaVinci.
 *
 * Handles token storage in the OS keychain, expiration checks,
 * and orchestrates the browser-based login process.
 */
export class AuthManager {
  private readonly config: AuthConfig;
  private readonly logger: Logger;
  private readonly redirectUri: string;
  private loginPromise: Promise<Tokens> | null = null;

  /**
   * Creates a new instance of AuthManager.
   *
   * @param config - Authentication configuration including client ID, environment ID, and domain settings.
   * @param logger - Logger instance for status and error messages.
   */
  constructor(config: AuthConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.redirectUri = constants.REDIRECT_URI;
  }

  /**
   * Gets the PingOne environment ID.
   *
   * @returns The environment ID UUID.
   */
  public getEnvironmentId(): string {
    return this.config.environmentId;
  }

  /**
   * Gets the root domain for PingOne services.
   *
   * @returns The root domain (e.g., "pingone.com").
   */
  public getRootDomain(): string {
    return this.config.rootDomain;
  }

  /**
   * Gets the custom domain if configured.
   *
   * @returns The custom domain or undefined.
   */
  public getCustomDomain(): string | undefined {
    return this.config.customDomain;
  }

  /**
   * Gets the logger instance.
   *
   * @returns The Logger instance used by AuthManager.
   */
  public getLogger(): Logger {
    return this.logger;
  }

  /**
   * Gets the base URL for authentication services.
   */
  private get authBaseUrl(): string {
    if (this.config.customDomain) {
      return `https://${this.config.customDomain}`;
    }
    return `https://auth.${this.config.rootDomain}/${this.config.environmentId}`;
  }

  /**
   * Gets the OAuth 2.0 token endpoint URL.
   */
  private get tokenUrl(): string {
    return `${this.authBaseUrl}/as/token`;
  }

  /**
   * Gets the OAuth 2.0 authorization endpoint URL.
   */
  private get authorizeUrl(): string {
    return `${this.authBaseUrl}/as/authorize`;
  }

  /**
   * Retrieves current tokens. Returns null if no tokens exist.
   */
  async getTokens(): Promise<Tokens | null> {
    const tokens = await this.loadTokens();
    if (!tokens) return null;

    if (this.isTokenExpired(tokens)) {
      return null;
    }

    return tokens;
  }

  /**
   * Loads tokens from the OS keychain.
   *
   * @returns A promise that resolves to the tokens or null if not found.
   */
  private async loadTokens(): Promise<Tokens | null> {
    let data: string | null;
    try {
      data = await keytar.getPassword(
        constants.OS_KEYCHAIN.SERVICE_NAME,
        constants.OS_KEYCHAIN.ACCOUNT_NAME,
      );
    } catch (error) {
      this.logger.error('Failed to access token storage:', error);
      return null;
    }

    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      if (!this.isValidTokenShape(parsed)) {
        this.logger.error('Token data has an invalid structure. Clearing storage.');
        await this.clearTokens();
        return null;
      }
      return parsed;
    } catch {
      this.logger.error('Token data is corrupted (invalid JSON). Clearing storage.');
      await this.clearTokens();
      return null;
    }
  }

  /**
   * Type-guard that validates the parsed object matches the {@link Tokens} shape.
   */
  private isValidTokenShape(data: unknown): data is Tokens {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.access_token === 'string' &&
      obj.access_token.length > 0 &&
      typeof obj.expires_at === 'number' &&
      !isNaN(obj.expires_at)
    );
  }

  /**
   * Saves tokens to the OS keychain.
   *
   * @param tokens - The tokens to save.
   */
  async saveTokens(tokens: Tokens): Promise<void> {
    try {
      await keytar.setPassword(
        constants.OS_KEYCHAIN.SERVICE_NAME,
        constants.OS_KEYCHAIN.ACCOUNT_NAME,
        JSON.stringify(tokens),
      );
    } catch (error) {
      this.logger.error('Failed to save tokens to storage:', error);
      throw error;
    }
  }

  /**
   * Clears tokens from the OS keychain.
   */
  async clearTokens(): Promise<void> {
    try {
      await keytar.deletePassword(
        constants.OS_KEYCHAIN.SERVICE_NAME,
        constants.OS_KEYCHAIN.ACCOUNT_NAME,
      );
    } catch (error) {
      this.logger.error('Failed to clear tokens from storage:', error);
      throw error;
    }
  }

  /**
   * Checks if the access token is expired or close to expiring.
   *
   * @param tokens - The tokens to check.
   * @returns True if the token is expired, false otherwise.
   */
  private isTokenExpired(tokens: Tokens): boolean {
    const BUFFER_MS = 60000;
    return tokens.expires_at < Date.now() + BUFFER_MS;
  }

  /**
   * Orchestrates the login process, ensuring only one login occurs at a time.
   */
  async login(): Promise<Tokens> {
    if (this.loginPromise) {
      return this.loginPromise;
    }

    this.loginPromise = this.performAuthorizationCodeLogin().finally(() => {
      this.loginPromise = null;
    });

    return this.loginPromise;
  }

  /**
   * Performs the OAuth 2.0 Authorization Code flow with PKCE.
   * Starts a local HTTP server to receive the authorization code.
   *
   * @returns A promise that resolves to the obtained tokens.
   */
  private async performAuthorizationCodeLogin(): Promise<Tokens> {
    const state = this.generateRandomString(16);
    const codeVerifier = this.generateRandomString(32);
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    return new Promise((resolve, reject) => {
      let settled = false;
      // eslint-disable-next-line prefer-const -- assigned after server.listen, but must be accessible in request handler
      let timeoutId: ReturnType<typeof setTimeout>;

      const server = createServer(async (req, res) => {
        try {
          const url = new URL(req.url || '', this.redirectUri);

          // Ignore noise like favicon.ico
          if (url.pathname !== new URL(this.redirectUri).pathname) {
            res.statusCode = 404;
            res.end();
            return;
          }

          const query = Object.fromEntries(url.searchParams.entries());

          if (query.error) {
            const errorMsg = (query.error_description as string) || (query.error as string);
            throw new Error(`Authentication failed: ${errorMsg}`);
          }

          if (query.state !== state) {
            throw new Error('Security check failed: state mismatch');
          }

          const code = query.code as string;
          if (!code) {
            throw new Error('Security check failed: authorization code not found');
          }

          if (code.length > constants.AUTH_CODE_MAX_LENGTH || !/^[\w\-.~]+$/.test(code)) {
            throw new Error('Security check failed: authorization code has an invalid format');
          }

          const tokens = await this.exchangeCodeForTokens(code, codeVerifier, this.redirectUri);

          res.setHeader('Content-Type', 'text/html');
          res.end(
            getAuthResultHtml({
              isSuccess: true,
              heading: 'Login Successful',
              message: 'You have successfully authenticated with PingOne DaVinci.',
            }),
          );

          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            server.close();
            resolve(tokens);
          }
        } catch (error) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/html');
          res.end(
            getAuthResultHtml({
              isSuccess: false,
              heading: 'Login Failed',
              message: 'An error occurred during authentication.',
              errorDetails: error instanceof Error ? error.message : String(error),
            }),
          );

          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            server.close();
            reject(error);
          }
        }
      });

      const portToUse = constants.AUTH_PORT;

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          if (err.code === 'EADDRINUSE') {
            reject(
              new Error(
                `Port ${portToUse} is already in use. Please ensure no other process is using this port.`,
              ),
            );
          } else {
            reject(
              new Error(
                `Failed to start local callback server: ${err instanceof Error ? err.message : String(err)}`,
              ),
            );
          }
        }
      });

      server.listen(portToUse, () => {
        const authUrl = this.buildAuthorizeUrl(state, codeChallenge, this.redirectUri);
        this.logger.warn(`Please complete login in your browser: ${authUrl}`);

        open(authUrl).catch((err) => {
          this.logger.error(
            'Failed to open browser automatically:',
            err instanceof Error ? err.message : String(err),
          );
        });
      });

      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          server.close();
          reject(new Error('Authentication timed out'));
        }
      }, constants.AUTH_TIMEOUT_MS);
    });
  }

  /**
   * Builds the OAuth 2.0 authorization URL.
   *
   * @param state - The state parameter for security.
   * @param codeChallenge - The PKCE code challenge.
   * @param redirectUri - The redirect URI.
   * @returns The authorization URL string.
   */
  private buildAuthorizeUrl(state: string, codeChallenge: string, redirectUri: string): string {
    const url = new URL(this.authorizeUrl);
    url.searchParams.append('client_id', this.config.clientId);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('state', state);
    url.searchParams.append('scope', 'openid');
    url.searchParams.append('code_challenge', codeChallenge);
    url.searchParams.append('code_challenge_method', 'S256');
    return url.toString();
  }

  /**
   * Exchanges an authorization code for tokens.
   *
   * @param code - The authorization code.
   * @param codeVerifier - The PKCE code verifier.
   * @param redirectUri - The redirect URI.
   * @returns A promise that resolves to the obtained tokens.
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<Tokens> {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', this.config.clientId);
    params.append('code_verifier', codeVerifier);

    const requestTime = Date.now();
    let response;
    try {
      response = await axios.post(this.tokenUrl, params);
    } catch (error) {
      throw new Error(
        `Failed to exchange code for tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const expiresIn = response.data.expires_in || 3600;

    if (!response.data.access_token || typeof response.data.access_token !== 'string') {
      throw new Error('Token response missing required access_token');
    }

    const tokens: Tokens = {
      access_token: response.data.access_token,
      expires_at: requestTime + expiresIn * 1000,
    };

    await this.saveTokens(tokens);
    return tokens;
  }

  /**
   * Generates a cryptographically strong random string.
   *
   * @param length - The length of the string to generate.
   * @returns The generated random string.
   */
  private generateRandomString(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generates a PKCE code challenge from a code verifier.
   *
   * @param codeVerifier - The PKCE code verifier.
   * @returns The generated code challenge.
   */
  private generateCodeChallenge(codeVerifier: string): string {
    return crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}
