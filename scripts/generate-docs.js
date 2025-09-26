#!/usr/bin/env node

/**
 * Documentation generation script
 * Generates both HTML and Markdown documentation from JSDoc comments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Generating documentation...\n');

try {
  // Ensure docs directory exists
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Generate HTML documentation
  console.log('Generating HTML documentation...');
  execSync('npm run docs', { stdio: 'inherit' });
  console.log('HTML documentation generated in docs/jsdoc/\n');

  // Generate Markdown documentation
  console.log('Generating Markdown documentation...');
  execSync('npm run docs:md', { stdio: 'inherit' });
  console.log('Markdown documentation generated in docs/api.md\n');

  console.log('Documentation generation complete!');
  console.log('HTML docs: docs/jsdoc/');
  console.log('Markdown docs: docs/api.md');

} catch (error) {
  console.error('Error generating documentation:', error.message);
  process.exit(1);
}
