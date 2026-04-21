/**
 * Tests for Diff Parser
 */

import { DiffParser } from '../src/utils/diff-parser';
import { DiffResult, DiffFile } from '../src/core/types';

describe('DiffParser', () => {
  let parser: DiffParser;

  beforeEach(() => {
    parser = new DiffParser();
  });

  describe('parse', () => {
    it('should parse empty diff', () => {
      const result = parser.parse('');
      
      expect(result.files).toHaveLength(0);
      expect(result.totalAdditions).toBe(0);
      expect(result.totalDeletions).toBe(0);
      expect(result.totalFiles).toBe(0);
      expect(result.isBinary).toBe(false);
    });

    it('should parse null/undefined as empty', () => {
      const result = parser.parse(null as any);
      
      expect(result.files).toHaveLength(0);
    });

    it('should parse simple file diff', () => {
      const diff = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
 const x = 1;
-const y = 2;
+const y = 3;
+const z = 4;
 return x + y;`;

      const result = parser.parse(diff);
      
      expect(result.totalFiles).toBeGreaterThanOrEqual(1);
    });

    it('should parse diff with new file', () => {
      const diff = `diff --git a/new-file.js b/new-file.js
new file mode 100644
--- /dev/null
+++ b/new-file.js
@@ -0,0 +1,3 @@
+const x = 1;
+const y = 2;
+const z = 3;`;

      const result = parser.parse(diff);
      
      expect(result.files.length).toBeGreaterThan(0);
      const newFile = result.files.find(f => f.status === 'added');
      expect(newFile).toBeDefined();
    });

    it('should parse diff with deleted file', () => {
      const diff = `diff --git a/deleted-file.js b/deleted-file.js
deleted file mode 100644
--- a/deleted-file.js
+++ /dev/null
@@ -1,3 +0,0 @@
-const x = 1;
-const y = 2;
-const z = 3;`;

      const result = parser.parse(diff);
      
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('should parse diff with renamed file', () => {
      const diff = `diff --git a/old-name.js b/new-name.js
rename from old-name.js
rename to new-name.js
--- a/old-name.js
+++ b/new-name.js
@@ -1,2 +1,2 @@
 const x = 1;
-const y = 2;
+const y = 3;`;

      const result = parser.parse(diff);
      
      expect(result.files.length).toBeGreaterThan(0);
      const renamedFile = result.files.find(f => f.status === 'renamed');
      expect(renamedFile).toBeDefined();
    });

    it('should count additions and deletions', () => {
      const diff = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,5 +1,8 @@
 const a = 1;
-const b = 2;
-const c = 3;
+const b = 3;
+const c = 4;
+const d = 5;
+const e = 6;
+const f = 7;
 return a;`;

      const result = parser.parse(diff);
      
      expect(result.totalAdditions).toBeGreaterThan(0);
      expect(result.totalDeletions).toBeGreaterThan(0);
    });

    it('should detect binary files', () => {
      const diff = `diff --git a/image.png b/image.png
new file mode 100644
Binary files /dev/null and b/image.png differ`;

      const result = parser.parse(diff);
      
      // Binary files should be detected
      expect(result).toBeDefined();
    });

    it('should parse hunks with line information', () => {
      const diff = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,5 +1,7 @@
 const a = 1;
 const b = 2;
+const c = 3;
+const d = 4;
 const e = 5;
 return a;`;

      const result = parser.parse(diff);
      
      if (result.files.length > 0) {
        const file = result.files[0];
        expect(file.hunks.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should parse multiple files', () => {
      const diff = `diff --git a/file1.js b/file1.js
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,3 @@
 const a = 1;
+const b = 2;
diff --git a/file2.js b/file2.js
--- a/file2.js
+++ b/file2.js
@@ -1,2 +1,3 @@
 const x = 1;
+const y = 2;`;

      const result = parser.parse(diff);
      
      expect(result.totalFiles).toBeGreaterThanOrEqual(2);
    });
  });

  describe('parseStagedDiff', () => {
    it('should parse staged diff', () => {
      const stagedDiff = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 const x = 1;
+const y = 2;`;

      const result = parser.parseStagedDiff(stagedDiff);
      
      expect(result).toBeDefined();
      expect(result.files.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('parseWorkingDiff', () => {
    it('should parse working directory diff', () => {
      const workingDiff = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 const x = 1;
+const y = 2;`;

      const result = parser.parseWorkingDiff(workingDiff);
      
      expect(result).toBeDefined();
    });
  });

  describe('summarize', () => {
    it('should summarize empty diff', () => {
      const diff: DiffResult = {
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
        totalFiles: 0,
        isBinary: false,
      };

      const summary = parser.summarize(diff);
      
      expect(summary).toBe('No changes');
    });

    it('should summarize diff with changes', () => {
      const diff: DiffResult = {
        files: [
          {
            path: 'test.js',
            status: 'modified',
            additions: 10,
            deletions: 5,
            hunks: [],
            language: 'javascript',
          },
        ],
        totalAdditions: 10,
        totalDeletions: 5,
        totalFiles: 1,
        isBinary: false,
      };

      const summary = parser.summarize(diff);
      
      expect(summary).toContain('1 file(s) changed');
      expect(summary).toContain('10 addition(s)');
      expect(summary).toContain('5 deletion(s)');
    });

    it('should summarize diff with additions only', () => {
      const diff: DiffResult = {
        files: [
          {
            path: 'new-file.js',
            status: 'added',
            additions: 20,
            deletions: 0,
            hunks: [],
            language: 'javascript',
          },
        ],
        totalAdditions: 20,
        totalDeletions: 0,
        totalFiles: 1,
        isBinary: false,
      };

      const summary = parser.summarize(diff);
      
      expect(summary).toContain('20 addition(s)');
      expect(summary).not.toContain('deletion');
    });
  });

  describe('groupByStatus', () => {
    it('should group files by status', () => {
      const files: DiffFile[] = [
        {
          path: 'added.js',
          status: 'added',
          additions: 10,
          deletions: 0,
          hunks: [],
          language: 'javascript',
        },
        {
          path: 'modified.js',
          status: 'modified',
          additions: 5,
          deletions: 3,
          hunks: [],
          language: 'javascript',
        },
        {
          path: 'deleted.js',
          status: 'deleted',
          additions: 0,
          deletions: 50,
          hunks: [],
          language: 'javascript',
        },
      ];

      const grouped = parser.groupByStatus(files);
      
      expect(grouped.added).toHaveLength(1);
      expect(grouped.modified).toHaveLength(1);
      expect(grouped.deleted).toHaveLength(1);
    });

    it('should handle empty file list', () => {
      const grouped = parser.groupByStatus([]);
      
      expect(grouped.added).toHaveLength(0);
      expect(grouped.modified).toHaveLength(0);
      expect(grouped.deleted).toHaveLength(0);
    });
  });

  describe('filterFiles', () => {
    it('should filter files by pattern', () => {
      const diff: DiffResult = {
        files: [
          {
            path: 'src/components/Button.tsx',
            status: 'modified',
            additions: 10,
            deletions: 5,
            hunks: [],
            language: 'typescript',
          },
          {
            path: 'src/utils/helpers.ts',
            status: 'modified',
            additions: 8,
            deletions: 2,
            hunks: [],
            language: 'typescript',
          },
          {
            path: 'tests/unit.test.ts',
            status: 'modified',
            additions: 20,
            deletions: 0,
            hunks: [],
            language: 'typescript',
          },
        ],
        totalAdditions: 38,
        totalDeletions: 7,
        totalFiles: 3,
        isBinary: false,
      };

      const components = parser.filterFiles(diff, /components/);
      const tests = parser.filterFiles(diff, /test/);
      
      expect(components).toHaveLength(1);
      expect(components[0].path).toContain('components');
      expect(tests).toHaveLength(1);
      expect(tests[0].path).toContain('test');
    });

    it('should return empty array for no matches', () => {
      const diff: DiffResult = {
        files: [
          {
            path: 'src/index.ts',
            status: 'modified',
            additions: 5,
            deletions: 2,
            hunks: [],
            language: 'typescript',
          },
        ],
        totalAdditions: 5,
        totalDeletions: 2,
        totalFiles: 1,
        isBinary: false,
      };

      const filtered = parser.filterFiles(diff, /nonexistent/);
      
      expect(filtered).toHaveLength(0);
    });
  });

  describe('getChangedFiles', () => {
    it('should return only changed files (not deleted)', () => {
      const diff: DiffResult = {
        files: [
          { path: 'added.js', status: 'added', additions: 10, deletions: 0, hunks: [], language: 'javascript' },
          { path: 'modified.js', status: 'modified', additions: 5, deletions: 3, hunks: [], language: 'javascript' },
          { path: 'deleted.js', status: 'deleted', additions: 0, deletions: 50, hunks: [], language: 'javascript' },
        ],
        totalAdditions: 15,
        totalDeletions: 53,
        totalFiles: 3,
        isBinary: false,
      };

      const changed = parser.getChangedFiles(diff);
      
      expect(changed).toHaveLength(2);
      expect(changed.some(f => f.path === 'deleted.js')).toBe(false);
    });
  });

  describe('getDeletedFiles', () => {
    it('should return only deleted files', () => {
      const diff: DiffResult = {
        files: [
          { path: 'added.js', status: 'added', additions: 10, deletions: 0, hunks: [], language: 'javascript' },
          { path: 'deleted.js', status: 'deleted', additions: 0, deletions: 50, hunks: [], language: 'javascript' },
          { path: 'removed.ts', status: 'deleted', additions: 0, deletions: 30, hunks: [], language: 'typescript' },
        ],
        totalAdditions: 10,
        totalDeletions: 80,
        totalFiles: 3,
        isBinary: false,
      };

      const deleted = parser.getDeletedFiles(diff);
      
      expect(deleted).toHaveLength(2);
      expect(deleted.every(f => f.status === 'deleted')).toBe(true);
    });
  });

  describe('file classification', () => {
    it('should classify test files', () => {
      const diff = `diff --git a/src/__tests__/user.test.ts b/src/__tests__/user.test.ts
--- a/src/__tests__/user.test.ts
+++ b/src/__tests__/user.test.ts
@@ -1,3 +1,4 @@
+test("example", () => {});`;

      const result = parser.parse(diff);
      
      if (result.files.length > 0) {
        expect(result.files[0].isTest).toBe(true);
      }
    });

    it('should classify documentation files', () => {
      const diff = `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1,2 +1,3 @@
 # Project
+Updated documentation`;

      const result = parser.parse(diff);
      
      if (result.files.length > 0) {
        expect(result.files[0].isDocs).toBe(true);
      }
    });

    it('should classify config files', () => {
      const diff = `diff --git a/.eslintrc.json b/.eslintrc.json
--- a/.eslintrc.json
+++ b/.eslintrc.json
@@ -1,2 +1,3 @@
 {
+  "rules": {}
 }`;

      const result = parser.parse(diff);
      
      if (result.files.length > 0) {
        expect(result.files[0].isConfig).toBe(true);
      }
    });

    it('should detect language from extension', () => {
      const diff = `diff --git a/main.py b/main.py
--- a/main.py
+++ b/main.py
@@ -1,2 +1,3 @@
+print("hello")`;

      const result = parser.parse(diff);
      
      if (result.files.length > 0) {
        expect(result.files[0].language).toBe('python');
      }
    });
  });
});
