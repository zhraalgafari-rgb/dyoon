const { execSync } = require('child_process');

try {
  console.log("Initializing git repository (git init)...");
  try {
    execSync('git status', { stdio: 'ignore' });
  } catch (e) {
    console.log("Not a git repository yet, initializing...");
    execSync('git init', { stdio: 'inherit' });
  }

  console.log("Adding changes to git...");
  execSync('git add .', { stdio: 'inherit' });

  console.log("Committing changes (amending to remove secrets)...");
  try {
    execSync('git commit --amend --no-edit', { stdio: 'inherit' });
  } catch (e) {
    try {
        execSync('git commit -m "Upload files and application to GitHub"', { stdio: 'inherit' });
    } catch (err) {
        console.log("No new changes to commit.");
    }
  }

  console.log("Setting remote URL...");
  try {
    execSync('git remote add origin https://github.com/zhraalgafari-rgb/dyoon.git', { stdio: 'ignore' });
  } catch (e) {
    execSync('git remote set-url origin https://github.com/zhraalgafari-rgb/dyoon.git', { stdio: 'ignore' });
  }

  console.log("Pushing to GitHub (Force push to overwrite unrelated history)...");
  execSync('git branch -M main', { stdio: 'inherit' });
  execSync('git push -u origin main -f', { stdio: 'inherit' });

  console.log("Successfully pushed to GitHub!");
} catch (error) {
  console.error("An error occurred during git operations:", error.message);
  process.exit(1);
}
