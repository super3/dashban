# GitHub OAuth Setup

To enable GitHub Sign In functionality and issue creation, you need to create a GitHub OAuth App.

## Setup Instructions

1. **Create a GitHub OAuth App**:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Click "New OAuth App"
   - Fill in the application details:
     - **Application name**: Dashban (or your preferred name)
     - **Homepage URL**: Your app's URL (e.g., `http://localhost:3000` for local development)
     - **Authorization callback URL**: Same as homepage URL (e.g., `http://localhost:3000`)
     - **Application description**: Optional description

2. **Get your Client ID**:
   - After creating the app, copy the "Client ID" from the app settings page
   - In `src/kanban.js`, replace `YOUR_GITHUB_OAUTH_CLIENT_ID` with your actual client ID

3. **Update Repository Settings**:
   - In `src/kanban.js`, update the `GITHUB_CONFIG.owner` and `GITHUB_CONFIG.repo` values to match your repository

## Usage

1. **Sign In**: Click the "Sign In with GitHub" button
2. **Authenticate**: You'll be redirected to GitHub to authorize the app
3. **Create Token**: Follow the prompt to create a Personal Access Token with `public_repo` scope
4. **Create Issues**: Use the "Add Issue" form with the "Create GitHub Issue" checkbox enabled

## Security Notes

- Client ID is safe to include in client-side code
- Personal Access Tokens are stored locally in your browser
- The app only requests `public_repo` scope for minimal permissions
- Tokens are validated before use and can be removed by signing out 