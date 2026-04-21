#!/usr/bin/env node

/**
 * Install CommitGPT Git Hook
 */

const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'commit-msg';
const HOOK_CONTENT = `#!/bin/sh
# CommitGPT - Intelligent Commit Message Generator
# This hook validates commit messages

# Get the commit message file
COMMIT_MSG_FILE="$1"

# Path to CommitGPT hook handler
HOOK_BIN="$(dirname "$0")/../node_modules/.bin/commitgpt-hook"

# Run hook if installed
if [ -f "$HOOK_BIN" ]; then
  node "$HOOK_BIN" "$COMMIT_MSG_FILE"
fi
`;

function installHook() {
  const gitDir = path.join(process.cwd(), '.git');
  const hooksDir = path.join(gitDir, 'hooks');
  const hookPath = path.join(hooksDir, HOOK_NAME);

  // Check if .git directory exists
  if (!fs.existsSync(gitDir)) {
    console.error('Error: Not a git repository. Run "git init" first.');
    process.exit(1);
  }

  // Create hooks directory if it doesn't exist
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Check if hook already exists
  if (fs.existsSync(hookPath)) {
    const existingContent = fs.readFileSync(hookPath, 'utf-8');
    if (existingContent.includes('CommitGPT')) {
      console.log('CommitGPT hook already installed.');
      return;
    }
    
    // Backup existing hook
    fs.writeFileSync(`${hookPath}.backup`, existingContent);
    console.log('Backed up existing hook to commit-msg.backup');
  }

  // Write new hook
  fs.writeFileSync(hookPath, HOOK_CONTENT, { mode: 0o755 });
  console.log('✓ CommitGPT hook installed successfully!');
  console.log(`  Hook path: ${hookPath}`);
}

function uninstallHook() {
  const hookPath = path.join(process.cwd(), '.git', 'hooks', HOOK_NAME);

  if (fs.existsSync(hookPath)) {
    const content = fs.readFileSync(hookPath, 'utf-8');
    if (content.includes('CommitGPT')) {
      fs.unlinkSync(hookPath);
      console.log('✓ CommitGPT hook uninstalled successfully!');
    } else {
      console.log('CommitGPT hook not found.');
    }
  } else {
    console.log('Hook file not found.');
  }
}

// Parse arguments
const args = process.argv.slice(2);

if (args.includes('--uninstall') || args.includes('-u')) {
  uninstallHook();
} else {
  installHook();
}
