#!/usr/bin/env node

/**
 * CommitGPT CLI
 * 
 * Command-line interface for CommitGPT - Intelligent Commit Message Generator
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CommitGPT } from '../core/commit-gpt';
import { ConfigManager } from '../utils/config-manager';
import { GitManager } from '../utils/git-manager';
import { MultiLanguageSupport } from '../analyzers/multi-language-support';
import { CommitHistoryAnalyzer } from '../analyzers/commit-history-analyzer';
import { AutoSquashSuggester } from '../generators/auto-squash-suggester';
import { ChangelogGenerator } from '../generators/changelog-generator';
import inquirer from 'inquirer';

const program = new Command();

// ANSI colors
const colors = {
  primary: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.cyan,
  muted: chalk.gray,
};

async function main() {
  program
    .name('commmitgpt')
    .alias('cgpt')
    .description('🤖 AI-Powered Intelligent Commit Message Generator')
    .version('1.0.0')
    .option('-c, --conventional', 'Use conventional commit format', true)
    .option('-i, --interactive', 'Interactive commit message crafting')
    .option('-l, --language <lang>', 'Language for commit messages', 'en')
    .option('--no-conventional', 'Disable conventional commit format')
    .option('--emoji', 'Include emoji in commits')
    .parse(process.argv);

  const opts = program.opts();
  const configManager = new ConfigManager();
  await configManager.load();

  const commitGPT = new CommitGPT({
    conventionalCommits: opts.conventional !== false,
    language: opts.language,
    includeEmoji: opts.emoji || false,
  });

  const gitManager = new GitManager();

  // Get command
  const [command] = program.args;

  if (!command) {
    // Default: generate commit message
    await generateCommit(commitGPT, gitManager, opts);
  } else {
    switch (command) {
      case 'init':
        await initProject(configManager);
        break;
      case 'analyze':
        await analyzeHistory(commitGPT, opts);
        break;
      case 'squash':
        await suggestSquash(gitManager, opts);
        break;
      case 'changelog':
      case 'changelog':
        await generateChangelog(gitManager, opts);
        break;
      case 'style':
        await learnStyle(commitGPT, opts);
        break;
      case 'config':
        await showConfig(configManager);
        break;
      case 'help':
        program.help();
        break;
      default:
        console.error(colors.error(`Unknown command: ${command}`));
        program.help();
    }
  }
}

async function generateCommit(
  commitGPT: CommitGPT,
  gitManager: GitManager,
  opts: any
) {
  const spinner = ora('Analyzing changes...').start();

  try {
    // Check for staged changes
    const stagedDiff = await gitManager.getStagedDiff();
    
    if (!stagedDiff) {
      spinner.fail('No staged changes found. Stage your changes with: git add');
      return;
    }

    // Initialize CommitGPT
    await commitGPT.initialize();

    // Generate commit message
    const analysis = await commitGPT.analyzeAndGenerate(stagedDiff, {
      conventionalCommits: opts.conventional !== false,
      language: opts.language,
    });

    spinner.succeed('Analysis complete!');

    // Display analysis results
    console.log('\n' + colors.info('━━━ Analysis Results ━━━'));
    console.log(`Intent: ${colors.primary(analysis.semantic.intent)}`);
    console.log(`Impact: ${colors.primary(analysis.semantic.impact)}`);
    console.log(`Scope: ${colors.primary(analysis.semantic.suggestedScope || 'none')}`);
    
    if (analysis.breakingChanges.length > 0) {
      console.log(colors.warning(`⚠️  Breaking changes detected: ${analysis.breakingChanges.length}`));
    }

    // Format and display commit message
    const message = commitGPT.formatMessage(analysis.conventional, opts.emoji);
    
    console.log('\n' + colors.success('━━━ Generated Commit Message ━━━'));
    console.log(message);

    // Show suggestions
    if (analysis.suggestions.length > 0) {
      console.log('\n' + colors.info('━━━ Suggestions ━━━'));
      for (const suggestion of analysis.suggestions) {
        const priorityColor = 
          suggestion.priority === 'high' ? colors.warning :
          suggestion.priority === 'medium' ? colors.info : colors.muted;
        console.log(`  ${priorityColor('[•]')} ${suggestion.message}`);
      }
    }

    // Interactive mode
    if (opts.interactive) {
      const { confirm, edit } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Use this commit message?',
          default: true,
        },
      ]);

      if (confirm) {
        const result = await gitManager.commit(message);
        if (result.success) {
          console.log(colors.success(`\n✅ Commit created: ${result.hash?.substring(0, 7)}`));
        } else {
          console.log(colors.error(`\n❌ Commit failed: ${result.error}`));
        }
      } else {
        // Edit mode
        const { editedMessage } = await inquirer.prompt([
          {
            type: 'editor',
            name: 'editedMessage',
            message: 'Edit commit message:',
            default: message,
          },
        ]);
        
        const result = await gitManager.commit(editedMessage);
        if (result.success) {
          console.log(colors.success(`\n✅ Commit created: ${result.hash?.substring(0, 7)}`));
        }
      }
    } else {
      // Copy to clipboard suggestion
      console.log('\n' + colors.muted('Tip: Copy the message above and run: git commit -m "..."'));
      
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Copy message and commit', value: 'commit' },
            { name: 'Edit message before committing', value: 'edit' },
            { name: 'Regenerate message', value: 'regenerate' },
            { name: 'Exit', value: 'exit' },
          ],
        },
      ]);

      switch (action) {
        case 'commit':
          const result = await gitManager.commit(message);
          if (result.success) {
            console.log(colors.success(`\n✅ Commit created: ${result.hash?.substring(0, 7)}`));
          }
          break;
        case 'edit':
          const { editedMessage } = await inquirer.prompt([
            {
              type: 'editor',
              name: 'editedMessage',
              message: 'Edit commit message:',
              default: message,
            },
          ]);
          const editResult = await gitManager.commit(editedMessage);
          if (editResult.success) {
            console.log(colors.success(`\n✅ Commit created: ${editResult.hash?.substring(0, 7)}`));
          }
          break;
        case 'regenerate':
          await generateCommit(commitGPT, gitManager, opts);
          break;
      }
    }
  } catch (error: any) {
    spinner.fail('Failed to generate commit message');
    console.error(colors.error(error.message));
  }
}

async function initProject(configManager: ConfigManager) {
  console.log(colors.info('Initializing CommitGPT for this project...'));
  
  await configManager.initProject();
  console.log(colors.success('✅ Project initialized!'));
  
  console.log('\nUsage:');
  console.log('  cgpt              - Generate commit message');
  console.log('  cgpt -i           - Interactive mode');
  console.log('  cgpt analyze      - Analyze commit history');
  console.log('  cgpt squash       - Suggest commits to squash');
  console.log('  cgpt changelog    - Generate changelog');
}

async function analyzeHistory(commitGPT: CommitGPT, opts: any) {
  const spinner = ora('Analyzing commit history...').start();
  
  try {
    await commitGPT.initialize();
    const historyAnalyzer = new CommitHistoryAnalyzer();
    
    const commits = await commitGPT.analyzeAndGenerate('', {} as any);
    
    spinner.succeed('Analysis complete!');
    
    console.log(colors.info('\n━━━ Commit History Analysis ━━━'));
    console.log('Run "cgpt analyze" for detailed statistics.');
  } catch (error: any) {
    spinner.fail('Failed to analyze history');
    console.error(colors.error(error.message));
  }
}

async function suggestSquash(gitManager: GitManager, opts: any) {
  const spinner = ora('Analyzing commits for squashing...').start();
  
  try {
    const commits = await gitManager.getCommits([], 20);
    const suggester = new AutoSquashSuggester();
    
    // Convert commits to historical format
    const historyCommits = commits.map(c => ({
      hash: c.hash,
      message: {
        type: 'chore' as any,
        subject: c.title,
        breaking: false,
        issueReferences: [],
        coAuthors: [],
      },
      timestamp: new Date(c.date),
      author: c.authorName,
      files: [],
      additions: 0,
      deletions: 0,
    }));
    
    const groups = suggester.suggest(historyCommits);
    
    spinner.succeed('Analysis complete!');
    
    if (groups.length === 0) {
      console.log(colors.muted('\nNo commits found that should be squashed.'));
      return;
    }
    
    console.log(colors.info('\n━━━ Squash Suggestions ━━━'));
    console.log(suggester.generateInstructions(groups));
    
    const savings = suggester.calculateSavings(groups);
    console.log(colors.success(`\n💡 Potential reduction: ${savings.reduction} commits (${savings.reductionPercent.toFixed(0)}%)`));
  } catch (error: any) {
    spinner.fail('Failed to suggest squash');
    console.error(colors.error(error.message));
  }
}

async function generateChangelog(gitManager: GitManager, opts: any) {
  const spinner = ora('Generating changelog...').start();
  
  try {
    const generator = new ChangelogGenerator();
    const commits = await gitManager.getCommits([], 100);
    
    const changelog = generator.generate(commits.map(c => ({
      hash: c.hash,
      message: c.message,
      title: c.title,
      authorName: c.authorName,
      authorEmail: c.authorEmail,
      date: c.date,
      timestamp: c.timestamp,
    })), {
      format: opts.format as any || 'markdown',
    });
    
    spinner.succeed('Changelog generated!');
    
    const content = generator.formatMarkdown(changelog);
    console.log('\n' + content);
    
    // Optionally save to file
    const { save } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'save',
        message: 'Save to CHANGELOG.md?',
        default: false,
      },
    ]);
    
    if (save) {
      const fs = require('fs');
      fs.writeFileSync('CHANGELOG.md', content, 'utf-8');
      console.log(colors.success('✅ Changelog saved to CHANGELOG.md'));
    }
  } catch (error: any) {
    spinner.fail('Failed to generate changelog');
    console.error(colors.error(error.message));
  }
}

async function learnStyle(commitGPT: CommitGPT, opts: any) {
  const spinner = ora('Learning from commit history...').start();
  
  try {
    await commitGPT.initialize();
    const style = await commitGPT.learnFromHistory();
    
    spinner.succeed('Learning complete!');
    
    console.log(colors.info('\n━━━ Team Style Profile ━━━'));
    console.log(`Language: ${style.language}`);
    console.log(`Max subject length: ${style.maxSubjectLength}`);
    console.log(`Include emoji: ${style.includeEmoji ? 'Yes' : 'No'}`);
    console.log(`Use body: ${style.useBody ? 'Yes' : 'No'}`);
    console.log(`Use footer: ${style.useFooter ? 'Yes' : 'No'}`);
    
    if (style.preferredScopes.length > 0) {
      console.log(`\nPreferred scopes: ${style.preferredScopes.slice(0, 5).join(', ')}`);
    }
    
    if (style.conventions.length > 0) {
      console.log('\nDetected conventions:');
      for (const conv of style.conventions) {
        console.log(`  • ${conv}`);
      }
    }
  } catch (error: any) {
    spinner.fail('Failed to learn style');
    console.error(colors.error(error.message));
  }
}

async function showConfig(configManager: ConfigManager) {
  const config = configManager.getAll();
  
  console.log(colors.info('━━━ CommitGPT Configuration ━━━'));
  console.log(`Conventional Commits: ${config.conventionalCommits ? 'Enabled' : 'Disabled'}`);
  console.log(`Language: ${config.language}`);
  console.log(`Max Subject Length: ${config.maxSubjectLength}`);
  console.log(`Include Emoji: ${config.includeEmoji ? 'Yes' : 'No'}`);
  console.log(`Learning Enabled: ${config.learningEnabled ? 'Yes' : 'No'}`);
  console.log(`Detect Breaking: ${config.detectBreaking ? 'Yes' : 'No'}`);
  
  const sources = configManager.getConfigSources();
  if (sources.length > 0) {
    console.log('\nConfig sources:');
    for (const source of sources) {
      console.log(`  • ${source.name}: ${source.path}`);
    }
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(colors.error('Error:'), error);
  process.exit(1);
});

// Run
main();
