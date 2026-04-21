# CommitGPT 🤖

[![CI](https://github.com/moggan1337/CommitGPT/actions/workflows/ci.yml/badge.svg)](https://github.com/moggan1337/CommitGPT/actions/workflows/ci.yml)

> AI-Powered Intelligent Commit Message Generator with Semantic Analysis and Conventional Commits

<div align="center">

![CommitGPT](https://img.shields.io/badge/CommitGPT-AI%20Commits-FF6B6B)
![Node](https://img.shields.io/badge/Node.js-18+-green.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

</div>

## 🎬 Demo

![CommitGPT Demo](demo.gif)

*AI-powered commit message generation*

## ✨ Features

- **AI-Powered** - GPT-4 generates context-aware commit messages
- **Conventional Commits** - Automatic format following best practices
- **Semantic Analysis** - Understands your code changes deeply
- **Scope Detection** - Automatically detects affected modules
- **Breaking Changes** - Identifies and marks breaking changes
- **Multi-Language** - Works with any programming language

## 🚀 Quick Start

```bash
npm install -g @moggan1337/commitgpt
git add .
cgpt commit
```

## 📝 Commit Flow Demo

### Interactive Commit Experience

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                              ⚡ CommitGPT ⚡                                      │
│                         AI-Powered Commit Messages                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

  Analyzing staged changes...
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%

  Detected Changes:
  ────────────────────────────────────────────────────────────────────────────
  
  📁 src/api/users.ts        │  +45 -12 lines  │  Modified
  📁 src/services/auth.ts    │  +89 -23 lines  │  Modified  
  📁 src/types/user.ts       │  +12 -3 lines   │  Modified
  📁 package.json             │  +2 -1 lines    │  Modified

  Total: 4 files | +148 -39 lines | ~15 minutes of work
  
  ────────────────────────────────────────────────────────────────────────────
  
  Analyzing code semantics...
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%
  
  🔍 Detected Features:
     • JWT authentication implementation
     • User profile endpoints
     • Password hashing with bcrypt
     • Input validation middleware
     
  🔍 Detected Fixes:
     • Race condition in session handling
     • Missing error boundary in auth flow
     
  🔍 Detected Refactors:
     • Extracted auth middleware
     • Improved type safety for User model

  ────────────────────────────────────────────────────────────────────────────
```

### Generated Commit Messages

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SUGGESTED COMMIT MESSAGES                               │
│                         Choose one or customize                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  1️⃣  FEAT (Conventional)                                                     │
  │  ─────────────────────────────────────────────────────────────────────────   │
  │                                                                              │
  │  feat(auth): implement JWT authentication with refresh tokens               │
  │                                                                              │
  │  - Add JWT token generation and validation in auth service                  │
  │  - Implement refresh token rotation for enhanced security                   │
  │  - Add password hashing with bcrypt (cost factor 12)                        │
  │  - Create /api/auth/login and /api/auth/refresh endpoints                   │
  │  - Add input validation middleware for auth routes                          │
  │                                                                              │
  │  Closes #234                                                                │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  2️⃣  FEAT + FIX (Comprehensive)                                              │
  │  ─────────────────────────────────────────────────────────────────────────   │
  │                                                                              │
  │  feat(auth): add JWT authentication and fix session race condition           │
  │                                                                              │
  │  BREAKING CHANGE: Session format has been updated                             │
  │  Old session: { userId, expires }                                           │
  │  New session: { userId, tokenId, refreshToken, iat, exp }                  │
  │                                                                              │
  │  Changes:                                                                   │
  │  • Implement JWT-based authentication replacing session cookies            │
  │  • Add refresh token rotation to prevent token reuse attacks               │
  │  • Fix race condition in concurrent login handling                          │
  │  • Extract auth middleware for cleaner route handlers                       │
  │  • Improve User type with proper TypeScript definitions                    │
  │                                                                              │
  │  Closes #234, #189                                                          │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  3️⃣  MINOR (Quick Summary)                                                   │
  │  ─────────────────────────────────────────────────────────────────────────   │
  │                                                                              │
  │  feat(auth): add JWT authentication with refresh token support               │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  4️⃣  CUSTOM                                                                   │
  │  ─────────────────────────────────────────────────────────────────────────   │
  │                                                                              │
  │  Enter your own commit message...                                            │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘

  ────────────────────────────────────────────────────────────────────────────
  
  Select option (1-4) or 'e' to edit: 
```

### Detailed Analysis View

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         🔍 DETAILED CHANGE ANALYSIS                             │
│                         src/api/users.ts                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

  CHANGE SUMMARY:
  ───────────────
  
  Line 12-34: Added /register endpoint
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  +  router.post('/register', validateBody(registerSchema), async (req, res)│
  │  +    => {                                                                 │
  │  +      const { email, password, name } = req.body;                         │
  │  +      const existingUser = await userService.findByEmail(email);         │
  │  +      if (existingUser) {                                                 │
  │  +        return res.status(409).json({ error: 'Email already registered'});│
  │  +      }                                                                   │
  │  +      const hashedPassword = await bcrypt.hash(password, 12);             │
  │  +      const user = await userService.create({ email, password, name });   │
  │  +      const token = generateToken(user.id);                               │
  │  +      res.status(201).json({ user, token });                              │
  │  +    }                                                                      │
  │  +  );                                                                       │
  └─────────────────────────────────────────────────────────────────────────────┘

  Line 45-67: Added /login endpoint
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  +  router.post('/login', validateBody(loginSchema), async (req, res) => {  │
  │  +    const { email, password } = req.body;                                  │
  │  +    const user = await userService.findByEmail(email);                     │
  │  +    if (!user || !await bcrypt.compare(password, user.password)) {        │
  │  +      return res.status(401).json({ error: 'Invalid credentials' });       │
  │  +    }                                                                      │
  │  +    const token = generateToken(user.id);                                  │
  │  +    res.json({ user, token });                                            │
  │  +  });                                                                      │
  └─────────────────────────────────────────────────────────────────────────────┘

  Line 78-89: Fixed error handling (was: bug fix)
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  -  } catch (err) {                                                         │
  │  -    res.status(500).json({ error: 'Server error' });                      │
  │  -  }                                                                       │
  │  +  } catch (err) {                                                         │
  │  +    logger.error('Auth error', { error: err, email });                    │
  │  +    res.status(500).json({ error: 'Authentication failed' });             │
  │  +  }                                                                       │
  └─────────────────────────────────────────────────────────────────────────────┘

  ────────────────────────────────────────────────────────────────────────────
  
  IMPACT ASSESSMENT:
  ═══════════════════
  
  Security Impact:     ████████████████░░░░░░░░░░░░░░░░░░░░░  MEDIUM (improved)
  API Changes:        ████████████████████████████████████░░  ADDED (2 new endpoints)
  Database Impact:    ████████████░░░░░░░░░░░░░░░░░░░░░░░░░  MINOR (1 new table)
  Breaking Changes:   ██████████████████████████████████░░░  SESSION FORMAT

  ────────────────────────────────────────────────────────────────────────────
  
  Related Issues: #234 (Authentication), #189 (User API)
  Reviewers Recommended: @alice, @bob
  Labels Suggested: feature, auth, security
```

### Commit History with AI Summaries

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         📜 COMMIT HISTORY (AI-ENHANCED)                          │
│                         Branch: feature/jwt-auth                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  commit a1b2c3d4e5f6                                                             │
│  Author: Sarah Chen <sarah@company.com>                                         │
│  Date:   2024-04-21 14:30:00                                                    │
│                                                                                  │
│      feat(auth): implement JWT authentication with refresh tokens               │
│                                                                                  │
│      • Add JWT token generation and validation                                  │
│      • Implement refresh token rotation                                          │
│      • Add bcrypt password hashing                                             │
│      • Create login/register endpoints                                         │
│      • Add input validation middleware                                          │
│                                                                                  │
│      Closes #234                                                                │
│                                                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  commit b2c3d4e5f6g7                                                             │
│  Author: Bob Smith <bob@company.com>                                             │
│  Date:   2024-04-21 13:45:00                                                    │
│                                                                                  │
│      fix(auth): resolve race condition in concurrent login handling             │
│                                                                                  │
│      • Add mutex lock for session creation                                      │
│      • Prevent duplicate session creation                                       │
│      • Add unit tests for concurrent scenarios                                  │
│                                                                                  │
│      Closes #189                                                                │
│                                                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  commit c3d4e5f6g7h8                                                             │
│  Author: Alice Johnson <alice@company.com>                                       │
│  Date:   2024-04-21 11:20:00                                                    │
│                                                                                  │
│      refactor(auth): extract middleware and improve type safety                  │
│                                                                                  │
│      • Extract validateToken middleware                                         │
│      • Improve User type definitions                                           │
│      • Add proper error types                                                  │
│                                                                                  │
│      Closes #178                                                                │
│                                                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  SPRINT SUMMARY (Feature: JWT Authentication):                                   │
│  ────────────────────────────────────────────                                   │
│  Total Commits: 7    │    Files Changed: 12    │    Lines Added: 456           │
│  Issues Closed: 3    │    Tests Added: 23      │    Coverage: +8%             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Breaking Changes Detection

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ⚠️ BREAKING CHANGES DETECTED                              │
└─────────────────────────────────────────────────────────────────────────────────┘

  CommitGPT has identified the following breaking changes:
  
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  🔴 BREAKING: Session format change                                          │
  │  ─────────────────────────────────────────────────────────────────────────   │
  │                                                                              │
  │  src/services/session.ts:23                                                 │
  │                                                                              │
  │  Old format:                                                                 │
  │  ┌───────────────────────────────────────────────────────────────────────┐   │
  │  │  { userId: string, expires: Date }                                    │   │
  │  └───────────────────────────────────────────────────────────────────────┘   │
  │                                                                              │
  │  New format:                                                                 │
  │  ┌───────────────────────────────────────────────────────────────────────┐   │
  │  │  { userId: string, tokenId: string, refreshToken: string,             │   │
  │  │                   iat: number, exp: number }                           │   │
  │  └───────────────────────────────────────────────────────────────────────┘   │
  │                                                                              │
  │  Migration Required:                                                          │
  │  • Update all code accessing session.expires to use session.exp            │
  │  • Add tokenId to session creation                                           │
  │  • Implement refresh token rotation                                          │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  🔴 BREAKING: User API response structure                                    │
  │  ─────────────────────────────────────────────────────────────────────────   │
  │                                                                              │
  │  GET /api/users/:id response changed:                                       │
  │                                                                              │
  │  Removed fields: passwordHash, salt                                         │
  │  Added fields: profileImage, createdAt, updatedAt                           │
  │                                                                              │
  │  Note: These changes are documented in the API changelog                    │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  🟡 DEPRECATION: Legacy auth endpoints                                        │
  │  ─────────────────────────────────────────────────────────────────────────   │
  │                                                                              │
  │  /api/auth/session (POST) will be removed in v3.0                            │
  │  Use /api/auth/login instead                                                │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘

  ────────────────────────────────────────────────────────────────────────────
  
  Include BREAKING CHANGE footer in commit? [Y/n]: Y
  
  Your commit will include:
  
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  BREAKING CHANGE: Session format has been updated to support JWT tokens     │
  │                                                                              │
  │  Migration Guide: https://docs.company.com/auth/migration-v2-to-v3          │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### CommitGPT Configuration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ⚙️ CommitGPT Configuration                                │
│                         ~/.commitgpt/config.json                                │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  {                                                                       │
  │    "style": "conventional",     // conventional | detailed | minimal       │
  │    "model": "gpt-4",           // gpt-4 | gpt-3.5-turbo                   │
  │    "maxLines": 5,              // Max body lines for conventional style   │
  │    "includeScope": true,        // Include file scope in type              │
  │    "detectBreakingChanges": true,                                       │
  │    "autoSelectScope": true,     // Auto-detect affected modules           │
  │    "conventionalConfig": {                                                   │
  │      "types": ["feat", "fix", "docs", "style", "refactor",                │
  │                 "perf", "test", "build", "ci", "chore", "revert"],        │
  │      "scopeOverrides": {                                                    │
  │        "package.json": "dependencies",                                    │
  │        "*.test.ts": "tests",                                              │
  │        "*.config.ts": "config"                                            │
  │      }                                                                     │
  │    },                                                                     │
  │    "templates": {                                                           │
  │      "conventional": "{type}{({scope})}: {summary}\n\n{body}\n\n{footer}", │
  │      "detailed": "{type}{({scope})}: {summary}\n\nImpact: {impact}\n\n"   │
  │                  "Changes:\n{changes}\n\nTests: {tests}\n\n{footer}"   │
  │    },                                                                     │
  │    "gitmoji": false,         // Use gitmoji prefixes                      │
  │    "maxChangesForSingle": 3  // Max files for single-commit suggestion    │
  │  }                                                                       │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Installation

```bash
npm install -g @moggan1337/commitgpt
```

## 📖 Usage

```bash
# Interactive commit
cgpt commit

# Quick commit (uses defaults)
cgpt commit --yes

# Dry run (preview only)
cgpt commit --dry-run

# Custom style
cgpt commit --style detailed

# With scope detection
cgpt commit --with-scope
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT © 2024 moggan1337
