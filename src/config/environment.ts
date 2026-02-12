/**
 * Centralized environment configuration
 */

const isDev = import.meta.env.DEV

export const ENV = {
  /** App URLs */
  appUrl: 'https://app.example.com',
  appNativeUrl: 'myapp://app.example.com',

  /** API Configuration */
  apiBaseUrl: isDev ? 'http://localhost:3000' : 'https://api.example.com',

  /** External URLs */
  accountPortalUrl: 'https://auth.example.com/account',
  supportUrl: 'https://example.com/support',
  supportEmail: 'support@example.com',

  /** App Metadata */
  appChannel: isDev ? 'dev' : 'prod',
  appVersion: '1.0.0',

  /** OAuth/OIDC Configuration */
  oauth: {
    authority: 'https://auth.example.com',
    clientId: 'your-client-id',
    redirectPath: '/login/callback',
    postLogoutRedirectPath: '/login',
    scope: 'openid profile email offline_access',
  },
} as const
