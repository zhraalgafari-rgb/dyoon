const { execSync } = require('child_process');

try {
  console.log("Setting remote URL...");
  try {
    execSync('git remote add origin https://github.com/zhraalgafari-rgb/dyoon.git', { stdio: 'inherit' });
  } catch (e) {
    execSync('git remote set-url origin https://github.com/zhraalgafari-rgb/dyoon.git', { stdio: 'inherit' });
  }
  
  console.log("Adding changes...");
  execSync('git add .', { stdio: 'inherit' });
  
  console.log("Committing changes...");
  try {
    execSync('git commit -m "Upload files and application to GitHub"', { stdio: 'inherit' });
  } catch (e) {
    console.log("Nothing new to commit or commit failed.");
  }
  
  console.log("Pushing to GitHub...");
  execSync('git branch -M main', { stdio: 'inherit' });
  execSync('git push -u origin main', { stdio: 'inherit' });
  
  console.log("Successfully pushed to GitHub!");
} catch (error) {
  console.error("An error occurred during git operations:", error.message);
  process.exit(1);
}
