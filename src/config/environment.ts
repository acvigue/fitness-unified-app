/**
 * Centralized environment configuration
 */

const isDev = import.meta.env.DEV

export const ENV = {
  /** App URLs */
  appUrl: 'https://fittime-teal.vercel.app',
  appNativeUrl: 'capacitor://localhost',

  /** API Configuration */
  apiBaseUrl: isDev ? 'http://localhost:5173' : 'https://fittime.api.koiosdigital.net',

  /** External URLs */
  accountPortalUrl: 'https://sso.koiosdigital.net/realms/fittime/account',
  supportUrl: 'https://example.com/support',
  supportEmail: 'support@example.com',

  /** App Metadata */
  appChannel: isDev ? 'dev' : 'prod',
  appVersion: '1.0.0',

  /** OAuth/OIDC Configuration */
  oauth: {
    authority: 'https://sso.koiosdigital.net/realms/fittime',
    clientId: 'fittime-app',
    redirectPath: '/login/callback',
    postLogoutRedirectPath: '/login',
    scope: 'openid profile email offline_access',
  },
} as const
