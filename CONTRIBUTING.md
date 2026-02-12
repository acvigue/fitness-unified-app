# Contributing Guide

Thank you for considering contributing to this project! This guide will help you understand our development practices and expectations.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Responsible AI Usage](#responsible-ai-usage)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Assume good intentions

## Getting Started

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `pnpm install`
3. **Set up your environment**: Copy and configure `src/config/environment.ts`
4. **Run the dev server**: `pnpm dev`
5. **Create a feature branch**: `git checkout -b feat/your-feature-name`

## Development Workflow

### 1. Before You Code

- Check existing issues and pull requests to avoid duplicates
- Open an issue to discuss significant changes before implementing
- Ensure you understand the project architecture (see [CLAUDE.md](./CLAUDE.md))

### 2. While Coding

- Write clean, readable, and maintainable code
- Follow the established patterns in the codebase
- Add comments for complex logic
- Keep functions small and focused
- Write TypeScript with proper type safety

### 3. Before Committing

- Run linting: `pnpm lint`
- Run type checking: `pnpm typecheck`
- Format code: `pnpm format`
- Test your changes thoroughly
- Write a proper commit message (see below)

## Commit Message Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to maintain a clean and meaningful git history. Commit messages are automatically validated using commitlint.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type

Must be one of the following:

- **feat**: New feature for the user
- **fix**: Bug fix for the user
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without changing functionality
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI/CD configuration
- **chore**: Other changes that don't modify src or test files
- **revert**: Revert a previous commit

### Scope

Optional. Indicates the area of the codebase affected:

- `auth`: Authentication system
- `api`: API client and integration
- `ui`: User interface components
- `router`: Routing configuration
- `store`: State management
- `mobile`: Mobile-specific features
- `deps`: Dependency updates

### Examples

```bash
# Good commit messages
feat(auth): add OAuth token refresh on 401 responses
fix(api): resolve race condition in token refresh
docs(readme): update authentication setup instructions
refactor(store): simplify auth state management
perf(api): implement request deduplication
test(auth): add token expiration tests
build(deps): upgrade vue-router to 4.6.4
ci: add automated deploy to staging
chore(config): update prettier config

# Bad commit messages (will be rejected)
update stuff
fixes
WIP
changed some files
asdf
```

### Writing Good Commit Messages

1. **Use imperative mood**: "add feature" not "added feature"
2. **Be specific**: Describe what changes and why
3. **Keep it concise**: Subject line under 100 characters
4. **Reference issues**: Include issue numbers when applicable

```bash
# Good
feat(auth): implement PKCE flow for native OAuth
- Add code verifier generation
- Store PKCE state in session storage
- Handle callback with code exchange

Closes #123

# Better than
feat: auth improvements
```

## Responsible AI Usage

This project acknowledges and encourages the responsible use of AI coding assistants (GitHub Copilot, Claude, ChatGPT, etc.) as development tools.

### Guidelines for AI-Assisted Development

#### ✅ Appropriate Uses

- **Code generation**: Using AI to scaffold boilerplate code
- **Refactoring**: Getting suggestions for code improvements
- **Documentation**: Generating initial documentation drafts
- **Problem-solving**: Exploring different approaches to a problem
- **Learning**: Understanding unfamiliar code patterns or APIs
- **Testing**: Generating test cases and edge cases

#### ⚠️ Requirements When Using AI

1. **Understand the code**: Never commit AI-generated code you don't fully understand
2. **Review thoroughly**: All AI-generated code must be carefully reviewed
3. **Test extensively**: Verify that AI-generated code works correctly
4. **Follow patterns**: Ensure AI code matches the project's existing patterns
5. **Type safety**: Verify TypeScript types are correct and meaningful
6. **Security**: Review for security vulnerabilities (XSS, injection, etc.)
7. **Attribution**: If using substantial AI-generated code, note it in PR description

#### ❌ Inappropriate Uses

- Committing AI code without understanding it
- Bypassing security reviews with AI-generated "fixes"
- Using AI to generate commit messages that misrepresent changes
- Copying AI code that violates licenses or includes proprietary patterns
- Using AI to bulk-generate code without manual review

#### Best Practices

```typescript
// ✅ Good: AI-assisted but reviewed and understood
// Generated with AI assistance, reviewed for security and type safety
export function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Prevent XSS
    .slice(0, 255) // Limit length
}

// ❌ Bad: Complex AI code without understanding
// Copied from AI without review or understanding edge cases
export function complexAlgorithm(data: any): any {
  // ... 100 lines of incomprehensible code
}
```

### Accountability

As a contributor, you are responsible for:

- The correctness of your code, regardless of how it was generated
- Understanding and explaining your implementation choices
- Ensuring code quality, security, and maintainability
- Being honest about your level of understanding

### Why This Matters

AI is a powerful tool, but it can:

- Generate insecure code
- Introduce subtle bugs
- Create unmaintainable patterns
- Violate type safety
- Miss edge cases

**Your judgment and expertise remain essential.**

## Code Style

### TypeScript

- Use strict TypeScript mode
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Use type aliases for unions and complex types

```typescript
// ✅ Good
interface User {
  id: string
  name: string
  email: string
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Bad
function getUser(id: any): any {
  // ...
}
```

### Vue Components

- Use Composition API with `<script setup>`
- Destructure props when possible
- Keep components focused and small
- Use TypeScript for prop types

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
}

const { title, count = 0 } = defineProps<Props>()
</script>
```

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Variables**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE for true constants
- **Components**: PascalCase
- **Composables**: camelCase starting with "use"

## Testing

While this project doesn't currently have a test suite, we encourage:

- Manual testing of all changes
- Testing on multiple browsers (Chrome, Safari, Firefox)
- Testing on mobile devices when applicable
- Testing both web and native builds for Capacitor changes

## Pull Request Process

### Before Submitting

1. ✅ All commits follow conventional commit format
2. ✅ Code is linted and formatted
3. ✅ TypeScript types are correct
4. ✅ Changes are tested manually
5. ✅ Documentation is updated if needed
6. ✅ No console.log or debugging code

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- List key changes
- Be specific

## Testing
- Describe how you tested
- List test scenarios covered

## AI Usage (if applicable)
- [ ] I used AI assistance for this PR
- [ ] All AI-generated code has been reviewed and understood
- [ ] I can explain all changes in detail

## Related Issues
Closes #123
```

### Review Process

1. Automated checks must pass (linting, type checking)
2. At least one maintainer approval required
3. All conversations must be resolved
4. No merge conflicts

### After Merge

- Delete your feature branch
- Monitor for any issues in production
- Update related documentation if needed

## Questions?

- Open an issue for bugs or feature requests
- Join discussions for questions about architecture
- Check [CLAUDE.md](./CLAUDE.md) for architecture documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).
