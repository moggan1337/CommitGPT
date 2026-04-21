# Contributing to CommitGPT

Thank you for your interest in contributing to CommitGPT!

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/CommitGPT.git
   cd CommitGPT
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Link for local testing:
   ```bash
   npm link
   ```

## Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and write tests

3. Run tests:
   ```bash
   npm test
   ```

4. Format code:
   ```bash
   npm run format
   ```

5. Lint:
   ```bash
   npm run lint
   ```

## Pull Request Process

1. Update documentation for any changed functionality
2. Add tests for new features
3. Ensure all tests pass
4. Update the CHANGELOG.md
5. Submit a pull request

## Code Style

- Use TypeScript
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful commit messages
- Comment complex logic

## Commit Messages

Follow Conventional Commits:
```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: restructure code
test: add tests
chore: update dependencies
```

## Reporting Issues

Please include:
- CommitGPT version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior

## Questions?

Feel free to open an issue for any questions!
