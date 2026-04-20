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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import keytar from 'keytar';
import axios from 'axios';
import { createServer } from 'http';
import crypto from 'crypto';
import { AuthManager } from '../../../src/modules/auth/manager.js';
import { AuthConfig } from '../../../src/types/auth/manager.js';
import { Logger } from '../../../src/utils/logger.js';

vi.mock('axios');
vi.mock('keytar');
vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

const mockServer = {
  listen: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
};

vi.mock('http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('http')>();
  return {
    ...actual,
    createServer: vi.fn((handler: unknown) => {
      capturedHandler = handler as CallbackHandler;
      return mockServer;
    }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CallbackHandler = (req: any, res: any) => void;
let capturedHandler: CallbackHandler;

const mockConfig: AuthConfig = {
  clientId: 'test-client-id',
  environmentId: 'test-env-id',
  rootDomain: 'pingidentity.com',
};

describe('AuthManager', () => {
  let authManager: AuthManager;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  const logger = new Logger(false);

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authManager = new AuthManager(mockConfig, logger);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('getTokens', () => {
    it('should return null if no tokens are stored', async () => {
      vi.mocked(keytar.getPassword).mockResolvedValue(null);
      const tokens = await authManager.getTokens();
      expect(tokens).toBeNull();
    });

    it('should return null if tokens are expired', async () => {
      const expiredTokens = {
        access_token: 'old-token',
        expires_at: Date.now() - 10000,
      };
      vi.mocked(keytar.getPassword).mockResolvedValue(JSON.stringify(expiredTokens));
      const tokens = await authManager.getTokens();
      expect(tokens).toBeNull();
    });

    it('should return tokens if they are valid', async () => {
      const validTokens = {
        access_token: 'valid-token',
        expires_at: Date.now() + 3600000,
      };
      vi.mocked(keytar.getPassword).mockResolvedValue(JSON.stringify(validTokens));
      const tokens = await authManager.getTokens();
      expect(tokens).toEqual(validTokens);
    });

    it('should return null and clear storage if data is invalid JSON', async () => {
      vi.mocked(keytar.getPassword).mockResolvedValue('not-valid-json{{{');
      const tokens = await authManager.getTokens();
      expect(tokens).toBeNull();
      expect(keytar.deletePassword).toHaveBeenCalled();
    });

    it('should return null and clear storage if data has wrong shape', async () => {
      vi.mocked(keytar.getPassword).mockResolvedValue(JSON.stringify({ wrong: 'shape' }));
      const tokens = await authManager.getTokens();
      expect(tokens).toBeNull();
      expect(keytar.deletePassword).toHaveBeenCalled();
    });

    it('should return null when keytar.getPassword throws', async () => {
      vi.mocked(keytar.getPassword).mockRejectedValue(new Error('keychain locked'));
      const tokens = await authManager.getTokens();
      expect(tokens).toBeNull();
      expect(keytar.deletePassword).not.toHaveBeenCalled();
    });
  });

  describe('saveTokens', () => {
    it('should save tokens to keytar', async () => {
      const tokens = {
        access_token: 'new-token',
        expires_at: Date.now() + 3600000,
      };
      await authManager.saveTokens(tokens);
      expect(keytar.setPassword).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        JSON.stringify(tokens),
      );
    });

    it('should re-throw when keytar fails to save', async () => {
      vi.mocked(keytar.setPassword).mockRejectedValue(new Error('keychain locked'));
      const tokens = { access_token: 'tok', expires_at: Date.now() + 3600000 };
      await expect(authManager.saveTokens(tokens)).rejects.toThrow('keychain locked');
    });
  });

  describe('clearTokens', () => {
    it('should delete tokens from keytar', async () => {
      await authManager.clearTokens();
      expect(keytar.deletePassword).toHaveBeenCalledWith(expect.any(String), expect.any(String));
    });

    it('should re-throw when keytar fails to delete', async () => {
      vi.mocked(keytar.deletePassword).mockRejectedValue(new Error('keychain locked'));
      await expect(authManager.clearTokens()).rejects.toThrow('keychain locked');
    });
  });

  describe('Configuration Getters', () => {
    it('should return environmentId', () => {
      expect(authManager.getEnvironmentId()).toBe(mockConfig.environmentId);
    });

    it('should return rootDomain', () => {
      expect(authManager.getRootDomain()).toBe(mockConfig.rootDomain);
    });

    it('should return customDomain when set', () => {
      const configWithCustom: AuthConfig = { ...mockConfig, customDomain: 'auth.example.com' };
      const mgr = new AuthManager(configWithCustom, logger);
      expect(mgr.getCustomDomain()).toBe('auth.example.com');
    });

    it('should return undefined customDomain when not set', () => {
      expect(authManager.getCustomDomain()).toBeUndefined();
    });

    it('should return the injected logger', () => {
      expect(authManager.getLogger()).toBe(logger);
    });
  });

  describe('login', () => {
    const fixedRandom = Buffer.alloc(32, 'ab');

    beforeEach(() => {
      mockServer.listen.mockReset();
      mockServer.close.mockReset();
      mockServer.on.mockReset();
      vi.mocked(keytar.setPassword).mockReset().mockResolvedValue();

      vi.spyOn(crypto, 'randomBytes').mockReturnValue(fixedRandom as unknown as void);
    });

    function simulateCallback(queryString: string) {
      const mockReq = { url: `/callback?${queryString}` };
      const mockRes = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      };
      // Trigger the server listen callback first, then the request
      const listenCallback = mockServer.listen.mock.calls[0][1];
      listenCallback();
      capturedHandler(mockReq, mockRes);
      return mockRes;
    }

    it('should complete login flow with valid auth code', async () => {
      const expectedState = fixedRandom.toString('hex');
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          expires_in: 3600,
        },
      });

      const loginPromise = authManager.login();

      // Wait for createServer + listen to be called
      await vi.waitFor(() => expect(mockServer.listen).toHaveBeenCalled());

      simulateCallback(`code=valid-auth-code&state=${expectedState}`);

      const tokens = await loginPromise;
      expect(tokens.access_token).toBe('new-access-token');
      expect(tokens.expires_at).toBeGreaterThan(Date.now());
      expect(keytar.setPassword).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should reject on state mismatch', async () => {
      const loginPromise = authManager.login();
      await vi.waitFor(() => expect(mockServer.listen).toHaveBeenCalled());

      simulateCallback('code=valid-code&state=wrong-state');

      await expect(loginPromise).rejects.toThrow('state mismatch');
    });

    it('should reject on missing auth code', async () => {
      const expectedState = fixedRandom.toString('hex');
      const loginPromise = authManager.login();
      await vi.waitFor(() => expect(mockServer.listen).toHaveBeenCalled());

      simulateCallback(`state=${expectedState}`);

      await expect(loginPromise).rejects.toThrow('authorization code not found');
    });

    it('should reject on invalid auth code format', async () => {
      const expectedState = fixedRandom.toString('hex');
      const loginPromise = authManager.login();
      await vi.waitFor(() => expect(mockServer.listen).toHaveBeenCalled());

      simulateCallback(`code=invalid<code>&state=${expectedState}`);

      await expect(loginPromise).rejects.toThrow('invalid format');
    });

    it('should reject on auth code exceeding max length', async () => {
      const expectedState = fixedRandom.toString('hex');
      const longCode = 'a'.repeat(2049);
      const loginPromise = authManager.login();
      await vi.waitFor(() => expect(mockServer.listen).toHaveBeenCalled());

      simulateCallback(`code=${longCode}&state=${expectedState}`);

      await expect(loginPromise).rejects.toThrow('invalid format');
    });

    it('should reject when token exchange fails', async () => {
      const expectedState = fixedRandom.toString('hex');
      vi.mocked(axios.post).mockRejectedValue(new Error('network error'));

      const loginPromise = authManager.login();
      await vi.waitFor(() => expect(mockServer.listen).toHaveBeenCalled());

      simulateCallback(`code=valid-code&state=${expectedState}`);

      await expect(loginPromise).rejects.toThrow('Failed to exchange code for tokens');
    });

    it('should reject when token response lacks access_token', async () => {
      const expectedState = fixedRandom.toString('hex');
      vi.mocked(axios.post).mockResolvedValue({
        data: { expires_in: 3600 },
      });

      const loginPromise = authManager.login();
      await vi.waitFor(() => expect(mockServer.listen).toHaveBeenCalled());

      simulateCallback(`code=valid-code&state=${expectedState}`);

      await expect(loginPromise).rejects.toThrow('missing required access_token');
    });

    it('should reject when OAuth error is returned in callback', async () => {
      const loginPromise = authManager.login();
      await vi.waitFor(() => expect(mockServer.listen).toHaveBeenCalled());

      simulateCallback('error=access_denied&error_description=User+denied+access');

      await expect(loginPromise).rejects.toThrow('User denied access');
    });

    it('should deduplicate concurrent login calls', async () => {
      const expectedState = fixedRandom.toString('hex');
      vi.mocked(axios.post).mockResolvedValue({
        data: { access_token: 'tok', expires_in: 3600 },
      });

      const p1 = authManager.login();
      const p2 = authManager.login();

      await vi.waitFor(() => expect(mockServer.listen).toHaveBeenCalled());
      simulateCallback(`code=valid-code&state=${expectedState}`);

      const [t1, t2] = await Promise.all([p1, p2]);
      expect(t1).toBe(t2);
      expect(createServer).toHaveBeenCalledTimes(1);
    });

    it('should reject on EADDRINUSE', async () => {
      const loginPromise = authManager.login();
      await vi.waitFor(() => expect(mockServer.on).toHaveBeenCalled());

      const errorHandler = mockServer.on.mock.calls.find(
        (c: unknown[]) => c[0] === 'error',
      )![1] as (err: NodeJS.ErrnoException) => void;
      const err = Object.assign(new Error('address in use'), { code: 'EADDRINUSE' });
      errorHandler(err as NodeJS.ErrnoException);

      await expect(loginPromise).rejects.toThrow('already in use');
    });

    it('should use custom domain in auth URL when configured', async () => {
      const configWithCustom: AuthConfig = { ...mockConfig, customDomain: 'auth.example.com' };
      const mgr = new AuthManager(configWithCustom, logger);
      const expectedState = fixedRandom.toString('hex');

      vi.mocked(axios.post).mockResolvedValue({
        data: { access_token: 'tok', expires_in: 3600 },
      });

      const loginPromise = mgr.login();
      await vi.waitFor(() => expect(mockServer.listen).toHaveBeenCalled());

      // Verify open was called with custom domain URL
      const openMod = await import('open');
      const listenCallback = mockServer.listen.mock.calls[0][1];
      listenCallback();
      expect(vi.mocked(openMod.default)).toHaveBeenCalledWith(
        expect.stringContaining('https://auth.example.com/as/authorize'),
      );

      simulateCallback(`code=valid-code&state=${expectedState}`);
      await loginPromise;

      // Token endpoint should also use custom domain
      expect(axios.post).toHaveBeenCalledWith(
        'https://auth.example.com/as/token',
        expect.any(URLSearchParams),
      );
    });
  });
});
