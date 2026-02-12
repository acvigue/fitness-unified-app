# Application Architecture

This is a Vue 3 + TypeScript mobile-first SPA template with Capacitor for native deployment, OpenAPI code generation, and OAuth2/OIDC authentication.

## Tech Stack

- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite 7
- **Language**: TypeScript
- **Routing**: Vue Router with authentication guards
- **State Management**: Pinia stores
- **UI Framework**: Nuxt UI (component library with Tailwind CSS 4)
- **Icons**: Iconify with Font Awesome 6 (solid, regular, brands)
- **Mobile**: Capacitor 8 for iOS/Android deployment
- **API Client**: openapi-fetch with TypeScript types from openapi-typescript
- **Authentication**: oidc-client-ts for OAuth2/OIDC with PKCE

## Project Structure

```
src/
├── assets/          # Static assets (CSS, images)
├── components/      # Vue components
├── composables/     # Vue composables (reusable logic)
├── config/          # Environment configuration
├── layouts/         # Page layout components
├── lib/             # Core libraries
│   ├── api/         # API client and helpers
│   └── auth/        # Authentication helpers
├── router/          # Vue Router configuration
├── stores/          # Pinia state stores
│   └── auth/        # Authentication store
├── types/           # TypeScript type definitions
│   └── api.d.ts     # OpenAPI generated types
├── utils/           # Utility functions
├── views/           # Route view components
├── App.vue          # Root component
└── main.ts          # Application entry point
```

## Core Architecture Patterns

### 1. Authentication System

**OAuth2/OIDC with PKCE Flow**

The app uses a sophisticated authentication system that works on both web and native platforms:

- **Store**: `src/stores/auth/auth.ts`
  - Manages authentication state (access token, refresh token)
  - Tokens stored in Capacitor Preferences (persists across app restarts)
  - Auto-refresh on app startup if token expired but refresh token available
  - JWT decoding to check token expiration

- **OIDC Client**: `src/stores/auth/oauthlib.ts`
  - Wraps `oidc-client-ts` library
  - Platform-aware authentication flows:
    - **Web**: Standard OAuth2 redirect flow
    - **Native**: In-app browser with universal links for callback
  - PKCE (Proof Key for Code Exchange) for enhanced security
  - Manual token refresh handling

**Key Features**:
- Automatic token refresh on 401 responses
- Redirect to login with return URL preservation
- Router guard prevents access to protected routes
- Public routes defined in router configuration

**Flow**:
1. User clicks login → `authStore.beginAuthentication()`
2. OAuth provider login (in-app browser on mobile, redirect on web)
3. Callback → `authStore.completeAuthentication(callbackUrl)`
4. Tokens stored in Capacitor Preferences
5. Router guard allows access to protected routes
6. API middleware adds Bearer token to all requests
7. On 401 → auto-refresh token → retry request
8. On refresh failure → redirect to login

### 2. API Client Architecture

**Type-Safe OpenAPI Integration**

The API layer uses `openapi-fetch` with generated TypeScript types from OpenAPI specs:

- **Client**: `src/lib/api/client.ts`
  - Configured with base URL from environment
  - Two middleware layers:
    1. **Auth Middleware**: Adds Bearer token, handles 401 with token refresh
    2. **Error Middleware**: Centralized error logging

- **Type Generation**: `npm run generate:api`
  - Fetches OpenAPI spec from backend
  - Generates TypeScript definitions → `src/types/api.d.ts`
  - Provides full type safety for API requests/responses

**Example Usage**:
```typescript
import { apiClient } from '@/lib/api/client'
import type { paths } from '@/types/api'

// Fully typed request and response
const { data, error } = await apiClient.GET('/api/resource/{id}', {
  params: { path: { id: '123' } }
})
```

**Authenticated Image Loading**:
- Composable: `src/composables/useAuthenticatedImage.ts`
- Fetches images with Bearer token
- Returns blob URL for use in `<img>` tags
- Auto-cleanup on unmount

### 3. State Management with Pinia

**Store Pattern**:
- Composition API style stores
- Refs for reactive state
- Computed for derived state
- Functions for actions

**Auth Store Example**:
```typescript
export const useAuthStore = defineStore('auth', () => {
  // State
  const accessToken = ref<string>()
  const refreshToken = ref<string>()

  // Computed
  const isLoggedIn = computed(() => {
    return accessToken.value !== undefined && !accessTokenExpired.value
  })

  // Actions
  async function initialize() { ... }
  async function logout() { ... }

  return { isLoggedIn, initialize, logout }
})
```

### 4. Routing with Authentication

**Router Configuration**: `src/router/index.ts`

- History mode: `createWebHistory('/')`
- Lazy-loaded route components for code splitting
- Global navigation guard for authentication
- Public routes whitelist

**Auth Guard Flow**:
```typescript
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // Initialize auth on first navigation
  if (!authInitialized) {
    await authStore.initialize()
    authInitialized = true
  }

  // Allow public routes
  if (PUBLIC_PATHS.has(to.path)) {
    return true
  }

  // Redirect to login if not authenticated
  if (!authStore.isLoggedIn) {
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    }
  }

  return true
})
```

### 5. UI Component System

**Nuxt UI Framework**:
- Pre-built accessible components (buttons, forms, modals, etc.)
- Dark mode by default
- Tailwind CSS 4 for styling
- Custom icon mappings to Font Awesome 6

**Layout Components**:
- `AppLayout.vue`: Root layout with safe area insets for mobile
- `PageLayout.vue`: Standard page with header, back button, title, actions
- `FullPageLayout.vue`: Full-screen layout without header
- `DetailPageView.vue`: Detail page with tabs/sections

**Composables for UI State**:
- `usePageHeader()`: Manage page title, back button, header actions
- `useSchemaForm()`: Dynamic form generation from schema definitions

### 6. Dynamic Schema-Driven Forms

**Schema Form System**: `src/composables/useSchemaForm.ts`

Supports dynamic form generation from JSON schemas with:
- Field types: text, number, select, toggle, OAuth2, generated fields
- Default values
- Validation with error display
- Conditional visibility (show/hide based on other field values)
- Disabled state based on conditions
- Generated fields (auto-filled from other field values)

**Features**:
- Reactive form values
- Validation error tracking per field
- Auto-initialization from schema defaults
- Edit mode with pre-filled values
- Visibility evaluation engine

### 7. Mobile-First Design

**Capacitor Integration**:
- Native iOS/Android builds via Capacitor CLI
- Platform detection: `Capacitor.isNativePlatform()`
- Capacitor plugins:
  - `@capacitor/preferences`: Secure storage (tokens, settings)
  - `@capacitor/browser`: In-app browser for OAuth
  - `@capacitor/app`: Deep link handling (universal links)
  - `@capacitor/inappbrowser`: System browser integration

**Universal Links**:
- iOS/Android universal links configured
- Deep link handler in `main.ts`:
  ```typescript
  CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    const parsed = new URL(url)
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
    router.push(path)
  })
  ```

**Safe Area Insets**:
- CSS environment variables for notch/home indicator
- Applied in `AppLayout.vue`:
  ```css
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  ```

### 8. Environment Configuration

**Centralized Config**: `src/config/environment.ts`

```typescript
export const ENV = {
  appUrl: 'https://app.example.com',
  appNativeUrl: 'myapp://app.example.com',
  apiBaseUrl: 'https://api.example.com',
  oauth: {
    authority: 'https://auth.example.com',
    clientId: 'my-client-id',
    redirectPath: '/login/callback',
    postLogoutRedirectPath: '/login',
    scope: 'openid profile email offline_access',
  },
} as const
```

### 9. Build Optimization

**Vite Configuration**: `vite.config.ts`

- **Code Splitting**: Manual chunks for vendor libraries
  - `vue-vendor`: Vue core
  - `vue-router`: Router
  - `pinia`: State management
  - `icons-*`: Icon data (split by style: solid, regular, brands)
  - `capacitor`: Native bridge
  - `ui-primitives`: Radix Vue components

- **Bundle Analysis**: Rollup visualizer plugin
  - Generates `dist/stats.html` after build
  - Shows bundle composition and sizes

### 10. Type Safety

**TypeScript Configuration**:
- Strict mode enabled
- Path aliases: `@/` → `src/`
- Vue 3 features: `defineModel`, props destructuring
- Separate configs for app and build tools

**Generated Types**:
- OpenAPI types: `src/types/api.d.ts`
- Component types: Auto-generated from Nuxt UI
- Auto-imports: Type definitions for composables

## Key Patterns and Best Practices

### Reactivity
- Use `ref()` for primitive values
- Use `reactive()` or `ref()` for objects
- Use `computed()` for derived state
- Use `watch()` for side effects

### Composables
- Reusable logic extraction
- Return reactive state and methods
- Use `onMounted()`, `onUnmounted()` for lifecycle
- Example pattern: `useAuthenticatedImage`, `useSchemaForm`

### API Error Handling
- Errors logged via middleware
- 401 → auto-refresh → retry
- Display user-friendly messages
- Type-safe error responses from OpenAPI

### Component Organization
- Feature-based folders when possible
- Layouts for page structure
- Composables for shared logic
- Store for global state

### Styling
- Tailwind utility classes preferred
- Scoped styles for component-specific CSS
- Mobile-first responsive design
- Dark mode as default theme

## Development Workflow

1. **Install Dependencies**: `pnpm install`
2. **Generate API Types**: `npm run generate:api`
3. **Start Dev Server**: `npm run dev`
4. **Build for Production**: `npm run build`
5. **Sync Native**: `npm run build && npx cap sync`
6. **Run iOS**: `npm run ios`
7. **Run Android**: `npm run android`

## Authentication Setup Guide

To configure authentication for your app:

1. Set up OAuth2/OIDC provider (e.g., Keycloak, Auth0)
2. Update `src/config/environment.ts` with OAuth settings
3. Configure redirect URIs in OAuth provider:
   - Web: `https://yourapp.com/login/callback`
   - Native: `yourapp://yourapp.com/login/callback`
4. Set up universal links (iOS) and App Links (Android)
5. Update `capacitor.config.ts` with app scheme

## API Integration Guide

1. Point to your OpenAPI spec in `package.json`:
   ```json
   "generate:api": "openapi-typescript YOUR_API_URL/openapi.json -o src/types/api.d.ts"
   ```
2. Run `npm run generate:api` to generate types
3. Use `apiClient` from `src/lib/api/client.ts` for all API calls
4. Authentication handled automatically via middleware

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/main.ts` | App entry, plugin registration, deep link handler |
| `src/App.vue` | Root component, wraps router with layout |
| `src/router/index.ts` | Route definitions, auth guard |
| `src/stores/auth/auth.ts` | Authentication state management |
| `src/stores/auth/oauthlib.ts` | OAuth/OIDC client wrapper |
| `src/lib/api/client.ts` | OpenAPI client with auth middleware |
| `src/config/environment.ts` | Environment configuration |
| `vite.config.ts` | Build configuration, code splitting |
| `capacitor.config.ts` | Native app configuration |

## Mobile Deployment

**iOS**:
1. `npm run ios` to open Xcode
2. Configure signing & capabilities
3. Set up universal links in entitlements
4. Build and deploy to App Store

**Android**:
1. `npm run android` to open Android Studio
2. Configure signing in `build.gradle`
3. Set up App Links in `AndroidManifest.xml`
4. Build and deploy to Play Store

## Best Practices for Extension

1. **New Features**: Create composables for reusable logic
2. **New Pages**: Add routes in `src/router/index.ts`
3. **Global State**: Add Pinia stores in `src/stores/`
4. **API Integration**: Regenerate types after API changes
5. **Mobile Testing**: Test on real devices for OAuth flow
6. **Performance**: Monitor bundle size with visualizer
7. **Type Safety**: Keep TypeScript strict mode enabled
8. **Authentication**: Use `authStore.getAccessToken()` for manual API calls
