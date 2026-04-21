/**
 * Tests for Semantic Analyzer
 */

import { SemanticAnalyzer } from '../src/analyzers/semantic-analyzer';
import { 
  DiffResult, 
  DiffFile, 
  DiffHunk, 
  DiffLine,
  CommitIntent,
  ImpactLevel,
  ComplexityLevel,
  RiskLevel,
} from '../src/core/types';

describe('SemanticAnalyzer', () => {
  let analyzer: SemanticAnalyzer;

  const createMockDiff = (overrides: Partial<DiffResult> = {}): DiffResult => ({
    files: [],
    totalAdditions: 0,
    totalDeletions: 0,
    totalFiles: 0,
    isBinary: false,
    rawDiff: '',
    ...overrides,
  });

  const createMockFile = (overrides: Partial<DiffFile> = {}): DiffFile => ({
    path: 'src/test.js',
    status: 'modified',
    additions: 10,
    deletions: 5,
    hunks: [],
    language: 'javascript',
    isTest: false,
    isConfig: false,
    isDocs: false,
    isBuild: false,
    ...overrides,
  });

  const createMockHunk = (lines: string[]): DiffHunk => ({
    header: '@@ -1,5 +1,8 @@',
    lines: lines.map(content => ({
      type: content.startsWith('+') ? 'add' : content.startsWith('-') ? 'delete' : 'context',
      content: content.substring(1),
    })),
    startLine: 1,
    lineCount: 5,
  });

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze a diff and return semantic analysis', async () => {
      const diff = createMockDiff({
        files: [createMockFile({ path: 'src/index.js' })],
        totalAdditions: 10,
        totalDeletions: 5,
        totalFiles: 1,
      });

      const result = await analyzer.analyze(diff);

      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.impact).toBeDefined();
      expect(result.complexity).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      expect(result.affectedAreas).toBeDefined();
      expect(result.suggestedScope).toBeDefined();
      expect(result.keywords).toBeDefined();
    });

    it('should classify feature intent', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'src/features/user/components/UserProfile.tsx',
          hunks: [createMockHunk([
            '+ function addNewFeature() {',
            '+   return "new feature";',
          ])],
        })],
        totalAdditions: 50,
        totalDeletions: 0,
      });

      const result = await analyzer.analyze(diff);

      expect(result.intent).toBe('feature');
    });

    it('should classify bugfix intent', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'src/utils/helper.ts',
          hunks: [createMockHunk([
            '- function brokenFunction() {',
            '-   return null;',
            '+ function fixedFunction() {',
            '+   if (!input) return "";',
            '+   return input.value;',
          ])],
        })],
        totalAdditions: 20,
        totalDeletions: 10,
      });

      const result = await analyzer.analyze(diff);

      expect(result.intent).toBe('bugfix');
    });

    it('should classify refactoring intent', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'src/core/manager.ts',
          hunks: [createMockHunk([
            '- class OldManager {',
            '-   constructor() {}',
            '+ class RefactoredManager {',
            '+   private config: Config;',
          ])],
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(result.intent).toBe('refactoring');
    });

    it('should classify documentation intent', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'README.md',
          hunks: [createMockHunk(['+ # Updated Documentation'])],
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(result.intent).toBe('documentation');
    });

    it('should classify testing intent', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'src/__tests__/user.test.ts',
          hunks: [createMockHunk([
            '+ describe("User", () => {',
            '+   it("should create user", () => {',
            '+     expect(createUser()).toBeDefined();',
            '+   });',
            '+ });',
          ])],
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(result.intent).toBe('testing');
    });

    it('should classify configuration intent', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'webpack.config.js',
          hunks: [createMockHunk(['+ module.exports = {'])]
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(result.intent).toBe('configuration');
    });

    it('should classify dependency intent', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'package.json',
          hunks: [createMockHunk(['+   "dependencies": {', '+     "lodash": "^4.17.21"'])],
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(result.intent).toBe('dependency');
    });

    it('should classify security intent', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'src/auth/validator.ts',
          hunks: [createMockHunk([
            '+ function sanitizeInput(input: string): string {',
            '+   return escapeHtml(input);',
            '+ }',
          ])],
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(result.intent).toBe('security');
    });

    it('should classify cleanup intent', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'src/utils/old-helper.ts',
          hunks: [createMockHunk([
            '- // @deprecated',
            '- function unusedFunction() {}',
            '+ // Cleaned up',
          ])],
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(result.intent).toBe('cleanup');
    });

    it('should identify affected areas', async () => {
      const diff = createMockDiff({
        files: [
          createMockFile({ path: 'src/components/Button.tsx' }),
          createMockFile({ path: 'src/components/Modal.tsx' }),
          createMockFile({ path: 'src/api/users.ts' }),
          createMockFile({ path: 'tests/unit.test.ts' }),
        ],
      });

      const result = await analyzer.analyze(diff);

      expect(result.affectedAreas).toContain('components');
      expect(result.affectedAreas).toContain('api');
    });

    it('should calculate impact level', async () => {
      const diff = createMockDiff({
        files: Array(25).fill(null).map((_, i) => 
          createMockFile({ path: `src/file${i}.ts` })
        ),
        totalAdditions: 600,
        totalDeletions: 400,
        totalFiles: 25,
      });

      const result = await analyzer.analyze(diff);

      expect(['critical', 'major', 'minor', 'trivial']).toContain(result.impact);
    });

    it('should calculate complexity', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          hunks: Array(10).fill(null).map(() => createMockHunk([
            '+ const x = 1;',
            '+ const y = 2;',
            '+ const z = 3;',
            '+ const w = 4;',
            '+ const v = 5;',
          ])),
        })],
        totalAdditions: 200,
        totalDeletions: 100,
      });

      const result = await analyzer.analyze(diff);

      expect(['low', 'medium', 'high']).toContain(result.complexity);
    });

    it('should calculate risk level', async () => {
      const diff = createMockDiff({
        files: [
          createMockFile({ path: 'src/database/migration.ts' }),
          createMockFile({ path: 'src/auth/security.ts' }),
        ],
      });

      const result = await analyzer.analyze(diff);

      expect(['low', 'medium', 'high']).toContain(result.riskLevel);
    });

    it('should suggest scope', async () => {
      const diff = createMockDiff({
        files: [createMockFile({ path: 'package.json' })],
      });

      const result = await analyzer.analyze(diff);

      expect(result.suggestedScope).toBeDefined();
      expect(typeof result.suggestedScope).toBe('string');
    });

    it('should extract keywords', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          hunks: [createMockHunk([
            '+ function calculateUserMetrics(data) {',
            '+   const processed = data.map(item => transform(item));',
            '+   return aggregate(processed);',
            '+ }',
          ])],
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(Array.isArray(result.keywords)).toBe(true);
    });

    it('should extract features', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          status: 'added',
          hunks: [createMockHunk([
            '+ class UserService {',
            '+   async createUser(data) {',
            '+     return this.repository.save(data);',
            '+   }',
            '+ }',
          ])],
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(Array.isArray(result.extractedFeatures)).toBe(true);
    });

    it('should extract bugs fixed', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          hunks: [createMockHunk([
            '- throw new Error("Unexpected error");',
            '+ try {',
            '+   await processData(data);',
            '+ } catch (error) {',
            '+   console.error(error);',
            '+ }',
          ])],
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(Array.isArray(result.bugsFixed)).toBe(true);
    });

    it('should detect breaking signals', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'src/api/routes.ts',
          hunks: [createMockHunk([
            '- app.get("/api/users", handler);',
            '+ app.post("/api/users", handler);',
          ])],
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(Array.isArray(result.breakingSignals)).toBe(true);
    });
  });

  describe('intent classification edge cases', () => {
    it('should handle empty diff', async () => {
      const diff = createMockDiff();
      const result = await analyzer.analyze(diff);

      expect(result.intent).toBe('unknown');
    });

    it('should handle unrecognized patterns', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'random-file.xyz',
          hunks: [createMockHunk(['+ some random content'])],
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(result.intent).toBeDefined();
    });

    it('should prioritize certain intents', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'src/security/auth.ts',
          hunks: [createMockHunk([
            '+ function authenticate(token) {',
            '+   return validateToken(token);',
            '+ }',
          ])],
        })],
      });

      const result = await analyzer.analyze(diff);

      // Security-related files should prioritize security intent
      expect(result.intent).toBeDefined();
    });
  });

  describe('complex diff analysis', () => {
    it('should analyze multi-file diffs', async () => {
      const diff = createMockDiff({
        files: [
          createMockFile({ path: 'src/index.ts', additions: 50, deletions: 30 }),
          createMockFile({ path: 'src/utils/helpers.ts', additions: 40, deletions: 20 }),
          createMockFile({ path: 'src/components/Button.tsx', additions: 60, deletions: 10 }),
          createMockFile({ path: 'README.md', additions: 20, deletions: 5 }),
          createMockFile({ path: 'package.json', additions: 5, deletions: 2 }),
        ],
        totalAdditions: 175,
        totalDeletions: 67,
        totalFiles: 5,
      });

      const result = await analyzer.analyze(diff);

      expect(result.affectedAreas.length).toBeGreaterThan(0);
      expect(result.suggestedScope).toBeDefined();
    });

    it('should handle renamed files', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'src/utils/renamed-file.ts',
          status: 'renamed',
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(result).toBeDefined();
    });

    it('should handle deleted files', async () => {
      const diff = createMockDiff({
        files: [createMockFile({
          path: 'src/old-feature/removed.ts',
          status: 'deleted',
          additions: 0,
          deletions: 100,
        })],
      });

      const result = await analyzer.analyze(diff);

      expect(result).toBeDefined();
    });
  });
});
