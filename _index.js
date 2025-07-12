const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const CREDLY_USERNAME = 'hairbui76';

async function interceptCredlyAPI() {
  console.log('Launching browser to intercept API calls...');

  const browser = await puppeteer.launch({
    headless: true,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    }
  });

  try {
    const userData = {
      id: null,
      badges: []
    };

    const page = await browser.newPage();

    // Enable request interception
    await page.setRequestInterception(true);

    // Intercept requests
    page.on('request', (request) => {
      request.continue();
    });

    // Intercept responses
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      console.log(url, status);

      // Look for API endpoints
      if (url.includes(`/users/${CREDLY_USERNAME}`) || url.includes("/badges?page=1&page_size=48")) {
        console.log('📥 API Response:', status, url);

        try {
          // Try to get JSON response
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json') && status === 200) {
            const data = await response.json();
            if (url.includes(`/users/${CREDLY_USERNAME}`)) {
              userData.id = data.data.id;
            } else if (url.includes("/badges?page=1&page_size=48")) {
              userData.badges = data.data;
            }
          }
        } catch (e) {
          console.error('Error parsing JSON:', e);
        }
      }
    });

    // Navigate to the page
    console.log(`\n🌐 Navigating to: https://www.credly.com/users/${CREDLY_USERNAME}/badges`);

    await page.goto(`https://www.credly.com/users/${CREDLY_USERNAME}/badges`, {
      waitUntil: 'networkidle2', // Wait until no network activity,
      timeout: 30000
    });

    console.log(`\n 🔍 All API calls completed!`);
    console.log(`\n ✅ User ${CREDLY_USERNAME} ID: ${userData.id}`);
    console.log(`\n 🔑 Number of Badges: ${userData.badges.length}`);

    return userData;
  } finally {
    await browser.close();
  }
}

function generateBadgesMarkdown(badgesData) {
  if (!badgesData || !badgesData.length) {
    console.error('No badges data to process');
    return '';
  }

  let markdown = ''

  // Sort badges by issued date (newest first)
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

    markdown += `<a href="${badgeUrl}" target="_blank">\n`;
    markdown += `  <img src="${imageUrl}" width="80" height="80 alt="${name}" title="${name}\nIssued by: ${issuer}\nDate: ${issuedDate}" />\n`;
    markdown += `</a>\n`;
  });

  markdown += '</div>\n\n';
  markdown += `*Last updated: ${new Date().toUTCString()}*\n`;

  return markdown;
}

async function updateReadme(badgesMarkdown) {
  const readmePath = path.join(process.cwd(), 'README.md');
  // Define markers for the badges section
  const startMarker = '<!-- CREDLY-BADGES:START -->';
  const endMarker = '<!-- CREDLY-BADGES:END -->';

  try {
    let readmeContent = await fs.readFile(readmePath, 'utf-8');

    // Check if markers exist
    if (readmeContent.includes(startMarker) && readmeContent.includes(endMarker)) {
      // Replace content between markers
      const startIndex = readmeContent.indexOf(startMarker) + startMarker.length;
      const endIndex = readmeContent.indexOf(endMarker);

      readmeContent =
        readmeContent.substring(0, startIndex) +
        '\n' + badgesMarkdown +
        readmeContent.substring(endIndex);
    } else {
      // If markers don't exist, append to the end
      console.log('Markers not found in README. Appending badges section...');
      readmeContent += '\n\n' + startMarker + '\n' + badgesMarkdown + endMarker + '\n';
    }

    await fs.writeFile(readmePath, readmeContent);
    console.log('README.md updated successfully!');
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Create README if it doesn't exist
      const newReadme = `# ${CREDLY_USERNAME}'s Profile\n\n${startMarker}\n${badgesMarkdown}${endMarker}\n`;
      await fs.writeFile(readmePath, newReadme);
      console.log('README.md created successfully!');
    } else {
      throw error;
    }
  }
}

async function main() {
  try {
    console.log('🔍 Starting Credly API interception...\n');

    const userData = await interceptCredlyAPI();

    if (userData.id) {
      console.log('\n✅ Successfully captured badges data!');
      const markdown = generateBadgesMarkdown(userData.badges);

      console.log('\nGenerated Markdown:');
      console.log('===================');
      console.log(markdown);

      await updateReadme(markdown);
      console.log('\n💾 Markdown updated!');
    } else {
      console.log('\n❌ No badges API data captured.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();