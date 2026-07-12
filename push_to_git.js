const { execSync } = require('child_process');

try {
  console.log("Removing .env from git tracking to fix GitHub Push Protection...");
  try {
    execSync('git rm --cached .env', { stdio: 'inherit' });
    console.log(".env removed from tracking.");
  } catch (e) {
    console.log(".env might not be tracked, which is fine.");
  }
  
  console.log("Adding other changes...");
  execSync('git add .', { stdio: 'inherit' });
  
  console.log("Committing or amending the commit...");
  try {
    execSync('git commit --amend --no-edit', { stdio: 'inherit' });
  } catch (e) {
    try {
      execSync('git commit -m "feat: unified realtime sync and auto exchange rates"', { stdio: 'inherit' });
    } catch (err) {
      console.log("Nothing new to commit.");
    }
  }
  console.log("Setting remote URL...");
  try {
    execSync('git remote add origin https://github.com/zhraalgafari-rgb/dyoon.git', { stdio: 'inherit' });
  } catch (e) {
    execSync('git remote set-url origin https://github.com/zhraalgafari-rgb/dyoon.git', { stdio: 'inherit' });
  }

  console.log("Pushing to GitHub...");
  execSync('git branch -M main', { stdio: 'inherit' });
  execSync('git push -u origin main', { stdio: 'inherit' });
  
  console.log("Successfully pushed to GitHub!");
} catch (error) {
  console.error("An error occurred during git operations:", error.message);
  process.exit(1);
}
