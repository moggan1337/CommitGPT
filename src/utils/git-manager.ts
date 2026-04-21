/**
 * Git Manager
 * 
 * Handles all git operations including:
 * - Getting staged/working diffs
 * - Commit operations
 * - History retrieval
 * - Branch management
 */

import simpleGit, { SimpleGit, LogResult } from 'simple-git';

export interface GitCommit {
  hash: string;
  message: string;
  title: string;
  authorName: string;
  authorEmail: string;
  date: string;
  timestamp: number;
  files?: string[];
  additions?: number;
  deletions?: number;
}

export interface GitBranch {
  name: string;
  current: boolean;
  branch: string;
}

export interface GitStatus {
  current: string | null;
  tracking: string | null;
  staged: string[];
  modified: string[];
  deleted: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export class GitManager {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath?: string) {
    this.repoPath = repoPath || process.cwd();
    this.git = simpleGit(this.repoPath);
  }

  /**
   * Get staged diff
   */
  async getStagedDiff(): Promise<string | null> {
    try {
      const diff = await this.git.diff(['--cached']);
      return diff || null;
    } catch (error) {
      console.error('Error getting staged diff:', error);
      return null;
    }
  }

  /**
   * Get working directory diff (staged + unstaged)
   */
  async getWorkingDiff(): Promise<string | null> {
    try {
      const diff = await this.git.diff();
      return diff || null;
    } catch (error) {
      console.error('Error getting working diff:', error);
      return null;
    }
  }

  /**
   * Get diff for specific files
   */
  async getDiffForFiles(files: string[]): Promise<string> {
    try {
      return await this.git.diff(['--', ...files]);
    } catch (error) {
      console.error('Error getting diff for files:', error);
      return '';
    }
  }

  /**
   * Get commits from history
   */
  async getCommits(
    hashes?: string[],
    maxCount: number = 100
  ): Promise<GitCommit[]> {
    try {
      let logResult: LogResult;
      
      if (hashes && hashes.length > 0) {
        // Get specific commits
        const range = `${hashes[0]}~1..${hashes[hashes.length - 1]}`;
        logResult = await this.git.log({ maxCount, from: range.split('~')[0], to: range.split('..')[1] });
      } else {
        // Get recent commits
        logResult = await this.git.log({ maxCount });
      }

      return logResult.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        title: commit.message.split('\n')[0],
        authorName: commit.author_name,
        authorEmail: commit.author_email,
        date: commit.date,
        timestamp: new Date(commit.date).getTime(),
      }));
    } catch (error) {
      console.error('Error getting commits:', error);
      return [];
    }
  }

  /**
   * Get commits since a specific ref
   */
  async getCommitsSince(since: string, maxCount: number = 100): Promise<GitCommit[]> {
    try {
      const logResult = await this.git.log({
        maxCount,
        from: since,
        to: 'HEAD',
      });

      return logResult.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        title: commit.message.split('\n')[0],
        authorName: commit.author_name,
        authorEmail: commit.author_email,
        date: commit.date,
        timestamp: new Date(commit.date).getTime(),
      }));
    } catch (error) {
      console.error('Error getting commits since:', error);
      return [];
    }
  }

  /**
   * Get commit details with file changes
   */
  async getCommitDetails(hash: string): Promise<{
    commit: GitCommit;
    files: { path: string; additions: number; deletions: number; status: string }[];
    diff: string;
  } | null> {
    try {
      const logResult = await this.git.log({ maxCount: 1, from: hash });
      if (logResult.all.length === 0) return null;

      const commit = logResult.all[0];
      
      // Get diff for this commit
      const diff = await this.git.diff([`${hash}^`, hash]);
      
      // Get file stats
      const show = await this.git.raw(['show', '--stat', '--numstat', hash]);
      const files = this.parseFileStats(show);

      return {
        commit: {
          hash: commit.hash,
          message: commit.message,
          title: commit.message.split('\n')[0],
          authorName: commit.author_name,
          authorEmail: commit.author_email,
          date: commit.date,
          timestamp: new Date(commit.date).getTime(),
        },
        files,
        diff,
      };
    } catch (error) {
      console.error('Error getting commit details:', error);
      return null;
    }
  }

  /**
   * Parse file stats from git show output
   */
  private parseFileStats(showOutput: string): { path: string; additions: number; deletions: number; status: string }[] {
    const files: { path: string; additions: number; deletions: number; status: string }[] = [];
    const lines = showOutput.split('\n');

    for (const line of lines) {
      const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*(?:(\+*)\s*(-*))?/);
      if (match) {
        const [, path, , additions, deletions] = match;
        files.push({
          path: path.trim(),
          additions: additions?.length || 0,
          deletions: deletions?.length || 0,
          status: 'modified',
        });
      }
    }

    return files;
  }

  /**
   * Create a commit
   */
  async commit(message: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      const result = await this.git.commit(message);
      return {
        success: true,
        hash: result.commit,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Commit failed',
      };
    }
  }

  /**
   * Amend last commit
   */
  async amend(message?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (message) {
        await this.git.commit(['--amend', '-m', message]);
      } else {
        await this.git.commit(['--amend', '--no-edit']);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string | null> {
    try {
      const status = await this.git.status();
      return status.current;
    } catch (error) {
      console.error('Error getting current branch:', error);
      return null;
    }
  }

  /**
   * Get all branches
   */
  async getBranches(): Promise<GitBranch[]> {
    try {
      const branches = await this.git.branchLocal();
      return branches.all.map(name => ({
        name,
        current: name === branches.current,
        branch: name,
      }));
    } catch (error) {
      console.error('Error getting branches:', error);
      return [];
    }
  }

  /**
   * Get git status
   */
  async getStatus(): Promise<GitStatus | null> {
    try {
      const status = await this.git.status();
      return {
        current: status.current,
        tracking: status.tracking,
        staged: status.staged,
        modified: status.modified,
        deleted: status.deleted,
        untracked: status.not_added,
        ahead: status.ahead,
        behind: status.behind,
      };
    } catch (error) {
      console.error('Error getting status:', error);
      return null;
    }
  }

  /**
   * Stage files
   */
  async stage(files: string[]): Promise<boolean> {
    try {
      await this.git.add(files);
      return true;
    } catch (error) {
      console.error('Error staging files:', error);
      return false;
    }
  }

  /**
   * Unstage files
   */
  async unstage(files: string[]): Promise<boolean> {
    try {
      await this.git.reset(['--', ...files]);
      return true;
    } catch (error) {
      console.error('Error unstaging files:', error);
      return false;
    }
  }

  /**
   * Get staged files
   */
  async getStagedFiles(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return status.staged;
    } catch (error) {
      console.error('Error getting staged files:', error);
      return [];
    }
  }

  /**
   * Get untracked files
   */
  async getUntrackedFiles(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return status.not_added;
    } catch (error) {
      console.error('Error getting untracked files:', error);
      return [];
    }
  }

  /**
   * Check if in git repository
   */
  async isRepo(): Promise<boolean> {
    try {
      return await this.git.checkIsRepo();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get remote URL
   */
  async getRemoteUrl(remote: string = 'origin'): Promise<string | null> {
    try {
      const remotes = await this.git.getRemotes(true);
      const remoteInfo = remotes.find(r => r.name === remote);
      return remoteInfo?.refs.fetch || null;
    } catch (error) {
      console.error('Error getting remote URL:', error);
      return null;
    }
  }

  /**
   * Get tags
   */
  async getTags(): Promise<string[]> {
    try {
      return await this.git.tags();
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  }

  /**
   * Get commits between two refs
   */
  async getCommitsRange(from: string, to: string, maxCount: number = 100): Promise<GitCommit[]> {
    try {
      const range = `${from}..${to}`;
      const logResult = await this.git.log({ maxCount, from, to });

      return logResult.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        title: commit.message.split('\n')[0],
        authorName: commit.author_name,
        authorEmail: commit.author_email,
        date: commit.date,
        timestamp: new Date(commit.date).getTime(),
      }));
    } catch (error) {
      console.error('Error getting commits range:', error);
      return [];
    }
  }

  /**
   * Get latest tag
   */
  async getLatestTag(): Promise<string | null> {
    try {
      const tags = await this.git.tags();
      if (tags.length === 0) return null;
      
      // Get most recent tag
      const tagDetails = await Promise.all(
        tags.map(async tag => {
          const date = await this.git.raw(['log', '-1', '--format=%ci', tag]);
          return { tag, date: new Date(date.trim()).getTime() };
        })
      );
      
      tagDetails.sort((a, b) => b.date - a.date);
      return tagDetails[0].tag;
    } catch (error) {
      console.error('Error getting latest tag:', error);
      return null;
    }
  }

  /**
   * Stash changes
   */
  async stash(message?: string): Promise<boolean> {
    try {
      if (message) {
        await this.git.stash(['push', '-m', message]);
      } else {
        await this.git.stash();
      }
      return true;
    } catch (error) {
      console.error('Error stashing:', error);
      return false;
    }
  }

  /**
   * Pop stash
   */
  async popStash(): Promise<boolean> {
    try {
      await this.git.stash(['pop']);
      return true;
    } catch (error) {
      console.error('Error popping stash:', error);
      return false;
    }
  }
}
