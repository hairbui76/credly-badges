// Set environment variables that GitHub would normally provide
process.env.INPUT_CREDLY_USER = 'hairbui76';
process.env.INPUT_GIT_COMMIT_MESSAGE = 'Test commit message';
process.env.INPUT_GIT_USER_NAME = 'Test User';
process.env.INPUT_GIT_USER_EMAIL = 'test@example.com';
process.env.INPUT_BADGE_SIZE = '80';
process.env.INPUT_README_FILE = '_README.md';

// Mock GitHub workspace
process.env.GITHUB_WORKSPACE = process.cwd();

// Run your action
require('./index.js');