/**
 * CommitGPT Test Suite
 */

import { SemanticAnalyzer } from '../src/analyzers/semantic-analyzer';
import { ConventionalCommitFormatter } from '../src/analyzers/conventional-commit-formatter';
import { BreakingChangeDetector } from '../src/analyzers/breaking-change-detector';
import { IssueLinker } from '../src/analyzers/issue-linker';
import { MultiLanguageSupport } from '../src/analyzers/multi-language-support';
import { DiffParser } from '../src/utils/diff-parser';

describe('SemanticAnalyzer', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  test('should detect feature intent', async () => {
    const diff = {
      files: [{
        path: 'src/features/auth.ts',
        status: 'added' as const,
        additions: 50,
        deletions: 0,
        hunks: [{
          header: '@@ -0,0 +1,10 @@',
          lines: [
            { type: 'add' as const, content: '+export function addUser() {' },
            { type: 'add' as const, content: '+  // Add new user' },
          ],
          startLine: 1,
          lineCount: 10,
        }],
        isTest: false,
        isConfig: false,
        isDocs: false,
        isBuild: false,
      }],
      totalAdditions: 50,
      totalDeletions: 0,
      totalFiles: 1,
      isBinary: false,
    };

    const result = await analyzer.analyze(diff);
    
    expect(result.intent).toBeDefined();
    expect(result.impact).toBeDefined();
    expect(result.suggestedScope).toBe('features');
  });

  test('should detect bugfix intent', async () => {
    const diff = {
      files: [{
        path: 'src/utils/validation.ts',
        status: 'modified' as const,
        additions: 5,
        deletions: 2,
        hunks: [{
          header: '@@ -10,5 +10,8 @@',
          lines: [
            { type: 'add' as const, content: '+  if (value === null) return false;' },
            { type: 'delete' as const, content: '-  return true;' },
          ],
          startLine: 10,
          lineCount: 8,
        }],
        isTest: false,
        isConfig: false,
        isDocs: false,
        isBuild: false,
      }],
      totalAdditions: 5,
      totalDeletions: 2,
      totalFiles: 1,
      isBinary: false,
    };

    const result = await analyzer.analyze(diff);
    
    expect(['bugfix', 'fix']).toContain(result.intent);
  });

  test('should identify affected areas', async () => {
    const diff = {
      files: [
        { path: 'src/components/Button.tsx', status: 'modified' as const, additions: 10, deletions: 5, hunks: [], isTest: false, isConfig: false, isDocs: false, isBuild: false },
        { path: 'src/components/Input.tsx', status: 'added' as const, additions: 20, deletions: 0, hunks: [], isTest: false, isConfig: false, isDocs: false, isBuild: false },
      ],
      totalAdditions: 30,
      totalDeletions: 5,
      totalFiles: 2,
      isBinary: false,
    };

    const result = await analyzer.analyze(diff);
    
    expect(result.affectedAreas).toContain('components');
  });
});

describe('ConventionalCommitFormatter', () => {
  let formatter: ConventionalCommitFormatter;

  beforeEach(() => {
    formatter = new ConventionalCommitFormatter(72);
  });

  test('should format basic commit message', () => {
    const semantic = {
      intent: 'feature' as const,
      impact: 'minor' as const,
      affectedAreas: ['auth'],
      complexity: 'low' as const,
      riskLevel: 'low' as const,
      suggestedScope: 'auth',
      keywords: ['login', 'oauth'],
      extractedFeatures: ['new login feature'],
      bugsFixed: [],
      performanceChanges: [],
      breakingSignals: [],
    };

    const diff = {
      files: [{
        path: 'src/auth/login.ts',
        status: 'added' as const,
        additions: 50,
        deletions: 0,
        hunks: [],
        isTest: false,
        isConfig: false,
        isDocs: false,
        isBuild: false,
      }],
      totalAdditions: 50,
      totalDeletions: 0,
      totalFiles: 1,
      isBinary: false,
    };

    const result = formatter.format(semantic, diff);
    
    expect(result.type).toBe('feat');
    expect(result.scope).toBe('auth');
    expect(result.subject).toBeDefined();
    expect(result.subject.length).toBeLessThanOrEqual(72);
  });

  test('should parse conventional commit', () => {
    const message = 'feat(auth): add OAuth2 login\n\nAdded Google and GitHub providers\n\nCloses #123';
    
    const result = formatter.parse(message);
    
    expect(result).not.toBeNull();
    expect(result!.type).toBe('feat');
    expect(result!.scope).toBe('auth');
    expect(result!.subject).toBe('add OAuth2 login');
    expect(result!.issueReferences).toContain('123');
  });

  test('should validate commit message', () => {
    const validMessage = {
      type: 'feat',
      subject: 'add new feature',
      breaking: false,
      issueReferences: [],
      coAuthors: [],
    };

    const invalidMessage = {
      type: 'feat',
      subject: 'A subject that is way too long and continues on and on and on and on and on and on and on and on and on',
      breaking: false,
      issueReferences: [],
      coAuthors: [],
    };

    const validResult = formatter.validate(validMessage);
    expect(validResult.valid).toBe(true);

    const invalidResult = formatter.validate(invalidMessage);
    expect(invalidResult.valid).toBe(false);
  });

  test('should convert to imperative mood', () => {
    const result = formatter.format({
      intent: 'feature' as const,
      impact: 'minor' as const,
      affectedAreas: ['api'],
      complexity: 'low' as const,
      riskLevel: 'low' as const,
      suggestedScope: 'api',
      keywords: [],
      extractedFeatures: ['added user endpoint'],
      bugsFixed: [],
      performanceChanges: [],
      breakingSignals: [],
    }, {
      files: [],
      totalAdditions: 10,
      totalDeletions: 0,
      totalFiles: 1,
      isBinary: false,
    });

    // Should not start with past tense
    expect(result.subject.split(' ')[0]).not.toBe('added');
  });
});

describe('BreakingChangeDetector', () => {
  let detector: BreakingChangeDetector;

  beforeEach(() => {
    detector = new BreakingChangeDetector();
  });

  test('should detect API removal', () => {
    const diff = {
      files: [{
        path: 'src/routes/api.ts',
        status: 'modified' as const,
        additions: 5,
        deletions: 10,
        hunks: [{
          header: '@@ -20,10 +20,5 @@',
          lines: [
            { type: 'delete' as const, content: '-  app.delete("/api/users");' },
          ],
          startLine: 20,
          lineCount: 5,
        }],
        isTest: false,
        isConfig: false,
        isDocs: false,
        isBuild: false,
      }],
      totalAdditions: 5,
      totalDeletions: 10,
      totalFiles: 1,
      isBinary: false,
      rawDiff: '-  app.delete("/api/users");\n',
    };

    const result = detector.detect(diff);
    
    expect(result.some(s => s.type === 'api-removal')).toBe(true);
  });

  test('should detect breaking change indicator', () => {
    const diff = {
      files: [{
        path: 'src/index.ts',
        status: 'modified' as const,
        additions: 1,
        deletions: 1,
        hunks: [{
          header: '@@ -1 +1 @@',
          lines: [
            { type: 'context' as const, content: '// BREAKING: Removed old API' },
          ],
          startLine: 1,
          lineCount: 1,
        }],
        isTest: false,
        isConfig: false,
        isDocs: false,
        isBuild: false,
      }],
      totalAdditions: 1,
      totalDeletions: 1,
      totalFiles: 1,
      isBinary: false,
      rawDiff: '// BREAKING: Removed old API',
    };

    const result = detector.detect(diff);
    
    expect(result.length).toBeGreaterThan(0);
  });

  test('should not flag new files as breaking', () => {
    const diff = {
      files: [{
        path: 'src/new-feature.ts',
        status: 'added' as const,
        additions: 50,
        deletions: 0,
        hunks: [{
          header: '@@ -0,0 +1,10 @@',
          lines: [
            { type: 'add' as const, content: '+export function newFeature() {}' },
          ],
          startLine: 1,
          lineCount: 10,
        }],
        isTest: false,
        isConfig: false,
        isDocs: false,
        isBuild: false,
      }],
      totalAdditions: 50,
      totalDeletions: 0,
      totalFiles: 1,
      isBinary: false,
    };

    const result = detector.detect(diff);
    
    expect(result.filter(s => s.confidence > 0.7).length).toBe(0);
  });
});

describe('IssueLinker', () => {
  let linker: IssueLinker;

  beforeEach(() => {
    linker = new IssueLinker();
  });

  test('should find GitHub issue references', () => {
    const text = 'This fixes #123 and closes #456';
    
    const result = linker.findReferences(text);
    
    expect(result.length).toBe(2);
    expect(result.some(r => r.id === '123')).toBe(true);
    expect(result.some(r => r.id === '456')).toBe(true);
  });

  test('should find closing keywords', () => {
    const text = 'Closes #123, fixes #456, resolves #789';
    
    const result = linker.findReferences(text);
    
    expect(result.length).toBe(3);
  });

  test('should extract from branch name', () => {
    const branch = 'feature/123-add-login';
    
    const result = linker.extractFromBranch(branch);
    
    expect(result.length).toBeGreaterThan(0);
  });

  test('should validate reference format', () => {
    expect(linker.validateReference('123')).toBe(true);
    expect(linker.validateReference('ABC-123')).toBe(true);
    expect(linker.validateReference('abc-123')).toBe(true);
    expect(linker.validateReference('invalid')).toBe(false);
  });
});

describe('MultiLanguageSupport', () => {
  let ml: MultiLanguageSupport;

  beforeEach(() => {
    ml = new MultiLanguageSupport();
  });

  test('should detect TypeScript projects', () => {
    const diff = {
      files: [
        { path: 'src/index.ts', status: 'modified' as const, additions: 10, deletions: 5, hunks: [], isTest: false, isConfig: false, isDocs: false, isBuild: false },
        { path: 'src/App.tsx', status: 'added' as const, additions: 20, deletions: 0, hunks: [], isTest: false, isConfig: false, isDocs: false, isBuild: false },
      ],
      totalAdditions: 30,
      totalDeletions: 5,
      totalFiles: 2,
      isBinary: false,
    };

    const result = ml.detectLanguage(diff);
    
    expect(result).toBe('en'); // Default for TypeScript
  });

  test('should get supported languages', () => {
    const languages = ml.getSupportedLanguages();
    
    expect(languages.length).toBeGreaterThan(0);
    expect(languages.some(l => l.code === 'en')).toBe(true);
    expect(languages.some(l => l.code === 'es')).toBe(true);
  });

  test('should set and get current language', () => {
    ml.setLanguage('es');
    expect(ml.getCurrentLanguage()).toBe('es');
  });

  test('should format type for display', () => {
    const en = ml.formatType('feat', 'en');
    const es = ml.formatType('feat', 'es');
    
    expect(en).toBe('Feature');
    expect(es).toBe('Característica');
  });
});

describe('DiffParser', () => {
  let parser: DiffParser;

  beforeEach(() => {
    parser = new DiffParser();
  });

  test('should parse unified diff', () => {
    const diffOutput = `diff --git a/src/index.ts b/src/index.ts
index abc123..def456 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,7 @@
+import { newFeature } from './new';
 export function main() {
-  console.log('old');
+  console.log('new');
+  newFeature();
 }`;

    const result = parser.parse(diffOutput);
    
    expect(result.totalFiles).toBe(1);
    expect(result.totalAdditions).toBeGreaterThan(0);
    expect(result.totalDeletions).toBeGreaterThan(0);
  });

  test('should handle empty diff', () => {
    const result = parser.parse('');
    
    expect(result.files).toEqual([]);
    expect(result.totalFiles).toBe(0);
  });

  test('should classify test files', () => {
    const diffOutput = `diff --git a/__tests__/example.test.ts b/__tests__/example.test.ts
--- a/__tests__/example.test.ts
+++ b/__tests__/example.test.ts
@@ -1 +1,3 @@
+import { test } from 'vitest';
+test('example', () => {});`;

    const result = parser.parse(diffOutput);
    
    expect(result.files[0].isTest).toBe(true);
  });

  test('should summarize diff', () => {
    const diff = {
      files: [
        { path: 'a.ts', status: 'added' as const, additions: 10, deletions: 0, hunks: [], isTest: false, isConfig: false, isDocs: false, isBuild: false },
        { path: 'b.ts', status: 'modified' as const, additions: 5, deletions: 3, hunks: [], isTest: false, isConfig: false, isDocs: false, isBuild: false },
      ],
      totalAdditions: 15,
      totalDeletions: 3,
      totalFiles: 2,
      isBinary: false,
    };

    const summary = parser.summarize(diff);
    
    expect(summary).toContain('2 file(s) changed');
    expect(summary).toContain('15 addition(s)');
    expect(summary).toContain('3 deletion(s)');
  });
});
