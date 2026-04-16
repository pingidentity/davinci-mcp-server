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

import { describe, it, expect, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { server } from '../src/index.js';

describe('davinci-mcp-server', () => {
  let client: Client;
  let clientTransport: InMemoryTransport;
  let serverTransport: InMemoryTransport;

  afterEach(async () => {
    await client?.close();
    await clientTransport?.close();
    await serverTransport?.close();
  });

  async function connectClient() {
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '0.1.0' });
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  }

  it('should list the echo tool', async () => {
    await connectClient();
    const { tools } = await client.listTools();
    expect(tools.some((t) => t.name === 'echo')).toBe(true);
  });

  it('should execute the echo tool', async () => {
    await connectClient();
    const result = await client.callTool({ name: 'echo', arguments: { message: 'hello' } });
    expect(result.content).toEqual([{ type: 'text', text: 'Echo: hello' }]);
  });
});
