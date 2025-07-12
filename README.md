# Credly Badges GitHub Action

Automatically fetch and display your Credly badges in your GitHub profile README.

## Prerequisites

Add these markers to your `README.md` where you want the badges to appear:

```markdown
<!-- CREDLY-BADGES:START -->
<!-- CREDLY-BADGES:END -->
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `CREDLY_USER` | Credly username | Yes | |
| `GIT_COMMIT_MESSAGE` | Git commit message | No | "Update Credly badges" |
| `GIT_USER_NAME` | Git user name for commits | No | "github-actions[bot]" |
| `GIT_USER_EMAIL` | Git user email for commits | No | "github-actions[bot]@users.noreply.github.com" |
| `BADGE_SIZE` | Size of badge images (width and height) | No | "80" |
| `README_FILE` | README file name | No | "README.md" |

## Usage

### Basic Usage

Add this to your `.github/workflows/update-badges.yml`:

```yaml
name: Update Credly Badges

on:
  schedule:
    # Runs daily at 2 AM UTC
    - cron: "0 2 * * *"
  workflow_dispatch: # Allow manual runs

jobs:
  update-badges:
    name: Update README with Credly Badges
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Update Badges
        uses: hairbui76/credly-badges@v1
        with:
          CREDLY_USER: ${{ github.actor }}
```

### Custom commit message and badge size

```yaml
- name: Update Badges
  uses: hairbui76/credly-badges@v1
  with:
    CREDLY_USER: your-credly-username
    GIT_COMMIT_MESSAGE: "docs: update certifications"
    BADGE_SIZE: 100
```

### Custom README file

```yaml
- name: Update Badges
  uses: hairbui76/credly-badges@v1
  with:
    CREDLY_USER: your-credly-username
    README_FILE: "README-BADGES.md"
```

## Development

1. Clone the repository
2. Run `npm install`
3. Make your changes
4. Test locally
5. Create a pull request
