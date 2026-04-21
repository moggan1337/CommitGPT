/**
 * Example: Basic Usage of CommitGPT
 */

import { CommitGPT } from '../src/index';

async function main() {
  // Initialize CommitGPT with options
  const commitGPT = new CommitGPT({
    conventionalCommits: true,
    language: 'en',
    includeEmoji: false,
    maxSubjectLength: 72,
  });

  // Initialize (loads config and learns from history)
  await commitGPT.initialize();

  // Example 1: Generate from staged changes
  console.log('=== Example 1: Generate from Staged Changes ===');
  const stagedMessage = await commitGPT.generateFromStaged();
  
  if (stagedMessage) {
    console.log(commitGPT.formatMessage(stagedMessage));
  }

  // Example 2: Analyze a diff directly
  console.log('\n=== Example 2: Analyze Diff ===');
  const sampleDiff = `diff --git a/src/auth/login.ts b/src/auth/login.ts
index abc123..def456 100644
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -1,5 +1,10 @@
+import { OAuth2Provider } from './oauth';
+
 export async function login(email: string, password: string) {
-  return authenticate(email, password);
+  const user = await authenticate(email, password);
+  if (!user) {
+    throw new Error('Invalid credentials');
+  }
+  await createSession(user);
+  return user;
 }`;

  const analysis = await commitGPT.analyzeAndGenerate(sampleDiff, {
    conventionalCommits: true,
  });

  console.log('Intent:', analysis.semantic.intent);
  console.log('Impact:', analysis.semantic.impact);
  console.log('Scope:', analysis.semantic.suggestedScope);
  console.log('Subject:', analysis.conventional.subject);
  
  if (analysis.breakingChanges.length > 0) {
    console.log('\n⚠️ Breaking changes detected:');
    analysis.breakingChanges.forEach(bc => {
      console.log(`  - ${bc.type}: ${bc.description}`);
    });
  }

  // Example 3: Generate changelog
  console.log('\n=== Example 3: Generate Changelog ===');
  const changelog = await commitGPT.generateChangelog({
    format: 'markdown',
  });

  console.log(changelog);

  // Example 4: Get style profile
  console.log('\n=== Example 4: Team Style Profile ===');
  const style = commitGPT.getStyleProfile();
  
  if (style) {
    console.log('Language:', style.language);
    console.log('Max Subject Length:', style.maxSubjectLength);
    console.log('Include Emoji:', style.includeEmoji);
    console.log('Preferred Scopes:', style.preferredScopes.slice(0, 5));
  }
}

main().catch(console.error);
