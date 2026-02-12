# Vue 3 Mobile Template

A production-ready Vue 3 + TypeScript template for building mobile-first web and native apps with OAuth authentication and OpenAPI integration.

## Features

- ⚡️ **Vue 3** with Composition API and TypeScript
- 📱 **Capacitor 8** for iOS/Android deployment
- 🔐 **OAuth2/OIDC** authentication with PKCE
- 🎨 **Nuxt UI** component library with Tailwind CSS 4
- 🔄 **OpenAPI** type-safe API client with auto-generated types
- 📦 **Pinia** for state management
- 🧭 **Vue Router** with authentication guards
- 🎯 **Dynamic Schema Forms** for rapid feature development
- 📲 **Universal Links** support for deep linking
- 🔒 **Secure Token Storage** with Capacitor Preferences
- 🚀 **Optimized Build** with code splitting and bundle analysis

## Quick Start

### Install Dependencies

```bash
pnpm install
```

### Configure Environment

Update `src/config/environment.ts` with your API and OAuth settings:

```typescript
export const ENV = {
  apiBaseUrl: 'https://api.yourapp.com',
  oauth: {
    authority: 'https://auth.yourapp.com',
    clientId: 'your-client-id',
    // ... other OAuth settings
  },
}
```

### Generate API Types

Point to your OpenAPI spec in `package.json`:

```json
"generate:api": "openapi-typescript https://api.yourapp.com/openapi.json -o src/types/api.d.ts"
```

Then run:

```bash
pnpm run generate:api
```

### Development

Start the development server:

```bash
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Building for Production

### Web

```bash
pnpm run build
pnpm run preview
```

### iOS

```bash
pnpm run build
pnpm run ios
```

### Android

```bash
pnpm run build
pnpm run android
```

## Project Structure

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production and sync Capacitor
- `pnpm preview` - Preview production build
- `pnpm ios` - Open iOS project in Xcode
- `pnpm android` - Open Android project in Android Studio
- `pnpm lint` - Lint code
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Type check with vue-tsc
- `pnpm generate:api` - Generate OpenAPI types

## Authentication Setup

This template uses OAuth2/OIDC with PKCE for secure authentication on both web and native platforms.

1. Set up an OAuth provider (Keycloak, Auth0, etc.)
2. Configure redirect URIs:
   - Web: `https://yourapp.com/login/callback`
   - Native: `yourapp://yourapp.com/login/callback`
3. Update `src/config/environment.ts` with OAuth settings
4. For native apps, configure universal links (iOS) and App Links (Android)

## API Integration

The template uses `openapi-fetch` for type-safe API calls with automatic authentication:

```typescript
import { apiClient } from '@/lib/api/client'

const { data, error } = await apiClient.GET('/api/users/{id}', {
  params: { path: { id: '123' } }
})
```

Features:
- Automatic Bearer token injection
- Token refresh on 401 responses
- Full TypeScript type safety from OpenAPI spec

## Mobile Development

### iOS Setup

1. Open project: `pnpm run ios`
2. Configure signing in Xcode
3. Add universal links in capabilities
4. Update `ios/App/App/Info.plist` with URL scheme

### Android Setup

1. Open project: `pnpm run android`
2. Configure signing in `android/app/build.gradle`
3. Add App Links in `android/app/src/main/AndroidManifest.xml`
4. Update `android/app/src/main/res/values/strings.xml`

## Contributing

We welcome contributions! This project follows strict development practices to maintain code quality.

### Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/). All commit messages are automatically validated.

**Format**: `<type>(<scope>): <subject>`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Examples**:
```bash
feat(auth): add OAuth token refresh mechanism
fix(api): resolve race condition in request queue
docs(readme): update installation instructions
refactor(store): simplify state management
```

Commits that don't follow this format will be **rejected** by the pre-commit hook.

### Development Guidelines

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines on:

- Development workflow and setup
- Code style and TypeScript conventions
- Commit message format and examples
- **Responsible AI usage in development**
- Pull request process
- Testing requirements

### Quick Contribution Checklist

Before submitting a PR:

- [ ] Code follows conventional commit format
- [ ] Ran `pnpm lint` and `pnpm typecheck`
- [ ] Ran `pnpm format` to format code
- [ ] Tested changes manually
- [ ] Updated documentation if needed
- [ ] Read and followed [CONTRIBUTING.md](./CONTRIBUTING.md) guidelines

## License

MIT
