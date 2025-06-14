const fs = require('fs');
const path = require('path');

const jestPath = path.join(__dirname, 'node_modules', '.bin', process.platform === 'win32' ? 'jest.cmd' : 'jest');

if (!fs.existsSync(jestPath)) {
  console.error('Jest is not installed. Run "npm install" before running tests.');
  process.exit(1);
}
