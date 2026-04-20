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

import { MCP_SERVER_NAME } from '../utils/constants.js';

/**
 * Options for generating the authentication result HTML.
 */
export interface AuthResultHtmlOptions {
  /** Whether the authentication was successful. */
  isSuccess: boolean;
  /** The main heading to display. */
  heading: string;
  /** The message body to display. */
  message: string;
  /** Optional error details to display if authentication failed. */
  errorDetails?: string;
}

/**
 * Escapes special HTML characters to prevent XSS attacks.
 *
 * @param str - The string to escape.
 * @returns The escaped string safe for HTML interpolation.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates a polished HTML page to display the result of an authentication attempt.
 *
 * Adapted from PingOne Go Client's auth_result.html template.
 *
 * @param options - The options for the HTML content.
 * @returns A complete HTML string.
 */
export function getAuthResultHtml(options: AuthResultHtmlOptions): string {
  const { isSuccess, errorDetails } = options;
  const projectName = escapeHtml(MCP_SERVER_NAME);
  const heading = escapeHtml(options.heading);
  const message = escapeHtml(options.message);

  const errorDetailsHtml = errorDetails
    ? `<div class="error-details"><strong>Error:</strong> ${escapeHtml(errorDetails)}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${projectName} - ${heading}</title>
  <link rel="favicon" href="https://assets.pingone.com/ux/ui-library/5.0.2/images/logo-pingidentity.png" />
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-color: #111827;
      --secondary-font-color: #6b7280;
      --page-background: #f0f2f6;
      --panel-background-color: #ffffff;
      --panel-border-color: #d9d8db;
    }
    html, body {
      height: 100%;
      margin: 0;
    }
    body {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      margin: 0;
      font-family: "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--page-background);
    }
    .container {
      display: flex;
      flex-direction: column;
      width: 800px;
      height: 450px;
      margin: 4rem auto 0;
      padding: 32px;
      box-sizing: border-box;
      background: var(--panel-background-color);
      border: 1px solid var(--panel-border-color);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
    }
    .content {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .logo {
      height: 50px;
      margin-bottom: 50px;
    }
    h1 {
      margin: 0 0 20px 0;
      font-size: 28px;
      font-weight: 600;
      color: var(--font-color);
    }
    p.subtitle {
      margin: 0;
      font-size: 15px;
      color: var(--secondary-font-color);
    }
    .error-details {
      margin-top: 20px;
      padding: 16px;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
      font-size: 14px;
      max-width: 600px;
      word-wrap: break-word;
    }
    #closeMessage {
      margin-top: 24px;
    }
    footer {
      margin-top: auto;
      padding: 24px;
      text-align: center;
      font-size: 13px;
      color: var(--secondary-font-color);
    }
    @media (max-width: 850px) {
      .container {
        width: 90%;
        margin: 2rem auto 0;
      }
    }
  </style>
</head>
<body>
  <div class="container" role="main">
    <div class="content">
      <img class="logo" src="https://cdn-docs.pingidentity.com/site-nav/ping-logo-horizontal.svg" alt="Ping Identity logo" />
      <h1>${heading}</h1>
      <p class="subtitle">${message}</p>
      ${errorDetailsHtml}
      <p class="subtitle" id="closeMessage">You can close this window.</p>
    </div>
  </div>
  <footer>
    &copy; Copyright <span id="year"></span> Ping Identity. All rights reserved.
  </footer>
  <script>
    document.getElementById('year').textContent = new Date().getFullYear();
    
    var isSuccess = ${isSuccess};
    if (isSuccess) {
      var countdown = 3;
      var closeMessage = document.getElementById('closeMessage');
      
      closeMessage.innerHTML = 'You may close this window to continue.<br><i>Attempting to close automatically in ' + countdown + ' seconds...</i>';
      
      var countdownInterval = setInterval(function() {
        countdown--;
        if (countdown > 0) {
          closeMessage.innerHTML = 'You may close this window to continue.<br><i>Attempting to close automatically in ' + countdown + ' seconds...</i>';
        } else {
          closeMessage.innerHTML = 'You may close this window to continue.';
          clearInterval(countdownInterval);
          setTimeout(function() {
            window.close();
          }, 500);
        }
      }, 1000);
    }
  </script>
</body>
</html>`;
}
