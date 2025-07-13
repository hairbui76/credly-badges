const core = require('@actions/core');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

async function run() {
  try {
    // Get inputs
    const credlyUser = core.getInput('CREDLY_USER', { required: true });
    const badgeSize = core.getInput('BADGE_SIZE') || '80';
    const readmeFile = core.getInput('README_FILE') || 'README.md';

    core.info(`Credly user: ${credlyUser}`);
    core.info(`Badge size: ${badgeSize}`);
    core.info(`README file: ${readmeFile}`);

    core.info(`Fetching badges for Credly user: ${credlyUser}`);

    // Fetch badges
    const userData = await interceptCredlyAPI(credlyUser);

    if (!userData.id || !userData.badges.length) {
      core.warning('No badges found for user');
      return;
    }

    core.info(`Found ${userData.badges.length} badges`);

    // Generate markdown
    const markdown = generateBadgesMarkdown(userData.badges, badgeSize);

    // Update README
    const changed = await updateReadme(markdown, readmeFile);

    if (changed) {
      core.info('README.md updated successfully!');
      const outputFile = process.env.GITHUB_OUTPUT;
      if (outputFile) {
        fsSync.appendFileSync(outputFile, 'changes_made=true\n');
      }
    } else {
      core.info('No changes detected in README.md');
      const outputFile = process.env.GITHUB_OUTPUT;
      if (outputFile) {
        fsSync.appendFileSync(outputFile, 'changes_made=false\n');
      }
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

async function interceptCredlyAPI(username) {
  core.info('Launching browser to fetch badges...');

  // In your index.js, update the browser launch:
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Important for Docker
      '--disable-gpu'
    ],
  });

  try {
    const userData = {
      id: null,
      badges: []
    };

    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      request.continue();
    });

    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();

      if (url.includes(`/users/${username}`) || url.includes("/badges?page=1&page_size=48")) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json') && status === 200) {
            const data = await response.json();
            if (url.includes(`/users/${username}`)) {
              userData.id = data.data.id;
            } else if (url.includes("/badges?page=1&page_size=48")) {
              userData.badges = data.data;
            }
          }
        } catch (e) {
          core.warning(`Error parsing JSON: ${e.message}`);
        }
      }
    });

    await page.goto(`https://www.credly.com/users/${username}/badges`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    return userData;
  } finally {
    await browser.close();
  }
}

function generateBadgesMarkdown(badgesData, size) {
  if (!badgesData || !badgesData.length) {
    return '';
  }

  let markdown = '\n';

  const badges = badgesData.sort((a, b) =>
    new Date(b.issued_at_date) - new Date(a.issued_at_date)
  );

  badges.forEach(badge => {
    const badgeUrl = `https://www.credly.com/badges/${badge.id}`;
    const imageUrl = badge.image_url || badge.badge_template?.image_url;
    const name = badge.badge_template?.name || 'Badge';
    const issuer = badge.badge_template?.issuer?.entities?.[0]?.entity?.name || 'Issuer';
    const issuedDate = new Date(badge.issued_at_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    markdown += `<a href="${badgeUrl}" target="_blank">`;
    markdown += `<img src="${imageUrl}" width="${size}" height="${size}" alt="${name}" title="${name}&#10;Issued by: ${issuer}&#10;Date: ${issuedDate}" />`;
    markdown += `</a>\n`;
  });

  markdown += '\n\n';
  markdown += `*Last updated: ${new Date().toUTCString()}*\n`;

  return markdown;
}

async function updateReadme(badgesMarkdown, readmeFile) {
  const workspacePath = process.env.GITHUB_WORKSPACE || process.cwd();
  const readmePath = path.join(workspacePath, readmeFile);
  const startMarker = '<!-- CREDLY-BADGES:START -->';
  const endMarker = '<!-- CREDLY-BADGES:END -->';

  try {
    let readmeContent = await fs.readFile(readmePath, 'utf-8');
    let originalContent = readmeContent;

    if (readmeContent.includes(startMarker) && readmeContent.includes(endMarker)) {
      const startIndex = readmeContent.indexOf(startMarker) + startMarker.length;
      const endIndex = readmeContent.indexOf(endMarker);

      readmeContent =
        readmeContent.substring(0, startIndex) +
        '\n' + badgesMarkdown +
        readmeContent.substring(endIndex);
    } else {
      core.warning('Markers not found in README. Appending badges section...');
      readmeContent += '\n\n' + startMarker + '\n' + badgesMarkdown + endMarker + '\n';
    }

    await fs.writeFile(readmePath, readmeContent);
    return readmeContent !== originalContent;
  } catch (error) {
    if (error.code === 'ENOENT') {
      const newReadme = `# Credly Badges\n\n${startMarker}\n${badgesMarkdown}${endMarker}\n`;
      await fs.writeFile(readmePath, newReadme);
      return true;
    } else {
      throw error;
    }
  }
}

run();