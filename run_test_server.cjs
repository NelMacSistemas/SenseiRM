const { execSync } = require('child_process');
try {
  console.log('Starting server...');
  const output = execSync('npx tsx server.ts', { encoding: 'utf8', timeout: 5000, stdio: 'pipe' });
  console.log('Server output:', output);
} catch (e) {
  console.error("SERVER CRASHED OR TIMED OUT!");
  console.error("Error message:", e.message);
  if (e.stdout) console.error("STDOUT:", e.stdout);
  if (e.stderr) console.error("STDERR:", e.stderr);
}
