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

import { describe, it, expect } from 'vitest';
import { getAuthResultHtml } from '../../src/configs/html.js';
import { MCP_SERVER_NAME } from '../../src/utils/constants.js';

describe('getAuthResultHtml', () => {
  it('should generate success HTML', () => {
    const options = {
      isSuccess: true,
      heading: 'Login Successful',
      message: 'You have successfully authenticated.',
    };

    const html = getAuthResultHtml(options);

    expect(html).toContain('<!doctype html>');
    expect(html).toContain(MCP_SERVER_NAME);
    expect(html).toContain(options.heading);
    expect(html).toContain(options.message);
    expect(html).toContain('var isSuccess = true;');
    expect(html).not.toContain('<div class="error-details">');
  });

  it('should generate failure HTML with error details', () => {
    const options = {
      isSuccess: false,
      heading: 'Login Failed',
      message: 'An error occurred.',
      errorDetails: 'Invalid client configuration',
    };

    const html = getAuthResultHtml(options);

    expect(html).toContain(options.heading);
    expect(html).toContain(options.message);
    expect(html).toContain(options.errorDetails);
    expect(html).toContain('var isSuccess = false;');
    expect(html).toContain('class="error-details"');
  });

  it('should escape HTML special characters to prevent XSS', () => {
    const options = {
      isSuccess: false,
      heading: '<script>alert("xss")</script>',
      message: 'Test <b>bold</b> & "quotes"',
      errorDetails: '<img onerror="alert(1)" src=x>',
    };

    const html = getAuthResultHtml(options);

    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).toContain('Test &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quotes&quot;');
    expect(html).not.toContain('<img onerror');
    expect(html).toContain('&lt;img onerror=&quot;alert(1)&quot; src=x&gt;');
  });
});
