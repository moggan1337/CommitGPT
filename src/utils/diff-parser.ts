/**
 * Diff Parser
 * 
 * Parses git diff output into structured data for analysis.
 * Supports unified diff format and various diff types.
 */

import { DiffResult, DiffFile, DiffHunk, DiffLine } from '../core/types';

// File status indicators
const FILE_STATUS_MAP: Record<string, DiffFile['status']> = {
  'A': 'added',
  'D': 'deleted',
  'M': 'modified',
  'R': 'renamed',
  'C': 'copied',
  'T': 'modified', // Type change
};

// File classification patterns
const FILE_PATTERNS = {
  test: /\/test[s]?\/|\/spec[s]?\/|\.test\.|\.spec\.|\/__tests?__\/|test_/i,
  docs: /\.md$|\.rst$|\.txt$|docs?\//i,
  config: /\.config\./|\.eslintrc|\.prettierrc|babel\.config|webpack\.config|\.env\./i,
  build: /webpack|babel|rollup|esbuild|vite|grunt|gulp/i,
  styles: /\.css$|\.scss$|\.sass$|\.less$|\.styl$/i,
};

// Programming language extensions
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.rb': 'ruby',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.php': 'php',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.html': 'html',
  '.vue': 'vue',
};

export class DiffParser {
  /**
   * Parse a git diff string into structured data
   */
  parse(diffOutput: string): DiffResult {
    if (!diffOutput || diffOutput.trim().length === 0) {
      return {
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
        totalFiles: 0,
        isBinary: false,
      };
    }

    const files: DiffFile[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;
    let isBinary = false;

    // Split by file headers
    const filePattern = /^(?:diff --git a\/(.+?) b\/(.+?)$|diff --git a\/(.+)$)/m;
    const parts = diffOutput.split(filePattern);

    // Process each file section
    for (let i = 0; i < parts.length; i += 3) {
      const pathMatch = parts[i + 1] || parts[i + 2];
      const fileContent = parts[i + 1] ? parts[i + 3] : undefined;
      
      if (pathMatch) {
        const fileDiff = this.parseFileDiff(pathMatch.trim(), fileContent || parts[i + 2] || '');
        if (fileDiff) {
          files.push(fileDiff);
          totalAdditions += fileDiff.additions;
          totalDeletions += fileDiff.deletions;
          if (fileDiff.path.includes('Binary')) {
            isBinary = true;
          }
        }
      }
    }

    // If no files parsed, try simple parsing
    if (files.length === 0) {
      const simpleFiles = this.parseSimpleDiff(diffOutput);
      files.push(...simpleFiles);
      for (const file of simpleFiles) {
        totalAdditions += file.additions;
        totalDeletions += file.deletions;
      }
    }

    return {
      files,
      totalAdditions,
      totalDeletions,
      totalFiles: files.length,
      isBinary,
      rawDiff: diffOutput,
    };
  }

  /**
   * Parse diff for a single file
   */
  private parseFileDiff(path: string, content: string): DiffFile | null {
    if (!path) return null;

    // Determine status
    let status: DiffFile['status'] = 'modified';
    if (content.includes('new file mode')) {
      status = 'added';
    } else if (content.includes('deleted file mode')) {
      status = 'deleted';
    } else if (content.includes('rename from')) {
      status = 'renamed';
    } else if (content.includes('copy from')) {
      status = 'copied';
    }

    // Parse hunks
    const hunks = this.parseHunks(content);

    // Calculate additions and deletions
    let additions = 0;
    let deletions = 0;
    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') additions++;
        if (line.type === 'delete') deletions++;
      }
    }

    // Classify file
    const ext = this.getExtension(path);
    const isTest = FILE_PATTERNS.test.test(path);
    const isConfig = FILE_PATTERNS.config.test(path);
    const isDocs = FILE_PATTERNS.docs.test(path);
    const isBuild = FILE_PATTERNS.build.test(path);

    return {
      path,
      status,
      additions,
      deletions,
      hunks,
      language: LANGUAGE_EXTENSIONS[ext],
      isTest,
      isConfig,
      isDocs,
      isBuild,
    };
  }

  /**
   * Parse diff hunks
   */
  private parseHunks(content: string): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    
    // Hunk header pattern: @@ -start,count +start,count @@
    const hunkPattern = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)?\n([\s\S]*?)(?=^@@|\n*$)/gm;
    
    let match;
    while ((match = hunkPattern.exec(content)) !== null) {
      const hunk: DiffHunk = {
        header: match[0].split('\n')[0],
        lines: [],
        startLine: parseInt(match[1]),
        lineCount: parseInt(match[2] || '1'),
      };

      // Parse lines
      const linesContent = match[6];
      const lines = linesContent.split('\n');
      
      for (const line of lines) {
        if (line.length === 0) continue;
        
        const type = line.startsWith('+') ? 'add' :
                     line.startsWith('-') ? 'delete' : 'context';
        
        hunk.lines.push({
          type,
          content: line.substring(1),
        });
      }

      hunks.push(hunk);
    }

    return hunks;
  }

  /**
   * Parse a simple diff format (fallback)
   */
  private parseSimpleDiff(content: string): DiffFile[] {
    const files: DiffFile[] = [];
    const lines = content.split('\n');
    
    let currentFile: DiffFile | null = null;
    
    for (const line of lines) {
      // File header
      if (line.startsWith('diff --git') || line.startsWith('---') || line.startsWith('+++')) {
        const pathMatch = line.match(/\+\+\+ b\/(.+)/) || line.match(/a\/(.+)/);
        if (pathMatch && pathMatch[1] !== '/dev/null') {
          if (currentFile) {
            files.push(currentFile);
          }
          
          const status = line.includes('--git') ? 'modified' : 
                        line.includes('new file') ? 'added' : 'modified';
          
          currentFile = {
            path: pathMatch[1],
            status,
            additions: 0,
            deletions: 0,
            hunks: [],
            language: LANGUAGE_EXTENSIONS[this.getExtension(pathMatch[1])],
            isTest: FILE_PATTERNS.test.test(pathMatch[1]),
            isConfig: FILE_PATTERNS.config.test(pathMatch[1]),
            isDocs: FILE_PATTERNS.docs.test(pathMatch[1]),
            isBuild: FILE_PATTERNS.build.test(pathMatch[1]),
          };
        }
      } else if (currentFile) {
        // Count additions/deletions
        if (line.startsWith('+') && !line.startsWith('+++')) {
          currentFile.additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          currentFile.deletions++;
        }
      }
    }
    
    if (currentFile) {
      files.push(currentFile);
    }
    
    return files;
  }

  /**
   * Get file extension
   */
  private getExtension(path: string): string {
    const match = path.match(/\.([^.]+)$/);
    return match ? '.' + match[1].toLowerCase() : '';
  }

  /**
   * Parse staged diff from git
   */
  parseStagedDiff(stagedOutput: string): DiffResult {
    return this.parse(stagedOutput);
  }

  /**
   * Parse working directory diff
   */
  parseWorkingDiff(workingOutput: string): DiffResult {
    return this.parse(workingOutput);
  }

  /**
   * Generate a summary of the diff
   */
  summarize(diff: DiffResult): string {
    const parts: string[] = [];
    
    if (diff.totalFiles === 0) {
      return 'No changes';
    }

    parts.push(`${diff.totalFiles} file(s) changed`);
    
    if (diff.totalAdditions > 0) {
      parts.push(`${diff.totalAdditions} addition(s)`);
    }
    
    if (diff.totalDeletions > 0) {
      parts.push(`${diff.totalDeletions} deletion(s)`);
    }

    // Group by status
    const byStatus = this.groupByStatus(diff.files);
    for (const [status, files] of Object.entries(byStatus)) {
      if (files.length > 0) {
        parts.push(`${files.length} ${status}`);
      }
    }

    return parts.join(', ');
  }

  /**
   * Group files by status
   */
  groupByStatus(files: DiffFile[]): Record<DiffFile['status'], DiffFile[]> {
    const groups: Record<string, DiffFile[]> = {
      added: [],
      modified: [],
      deleted: [],
      renamed: [],
      copied: [],
    };

    for (const file of files) {
      if (groups[file.status]) {
        groups[file.status].push(file);
      }
    }

    return groups as Record<DiffFile['status'], DiffFile[]>;
  }

  /**
   * Filter files by pattern
   */
  filterFiles(diff: DiffResult, pattern: RegExp): DiffFile[] {
    return diff.files.filter(file => pattern.test(file.path));
  }

  /**
   * Get changed files only (excluding deleted)
   */
  getChangedFiles(diff: DiffResult): DiffFile[] {
    return diff.files.filter(file => file.status !== 'deleted');
  }

  /**
   * Get deleted files only
   */
  getDeletedFiles(diff: DiffResult): DiffFile[] {
    return diff.files.filter(file => file.status === 'deleted');
  }
}
