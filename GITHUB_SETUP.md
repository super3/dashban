# GitHub App Setup

To enable GitHub App functionality and issue creation with fine-grained permissions, you need to create a GitHub App.

## Setup Instructions

### 1. Create a GitHub App

1. **Go to GitHub Settings > Developer settings > GitHub Apps**
2. **Click "New GitHub App"**
3. **Fill in the application details**:
   - **GitHub App name**: `dashban-app` (must be unique across GitHub)
   - **Homepage URL**: Your app's URL (e.g., `http://localhost:8000`)
   - **Callback URL**: Same as homepage URL (e.g., `http://localhost:8000`)
   - **Setup URL**: Leave blank
   - **Webhook URL**: Leave blank (uncheck "Active")
   - **Webhook secret**: Leave blank

### 2. Set Permissions (Most Important!)

In the **Permissions** section, set:
- **Repository permissions**:
  - **Issues**: `Read and write` ✅
  - **Metadata**: `Read` ✅
  - **Contents**: `No access` ❌
  - **Pull requests**: `No access` ❌
  - All others: `No access` ❌

- **Account permissions**: All `No access`

### 3. Configure Installation

- **Where can this GitHub App be installed?**: 
  - Choose "Only on this account" for personal use
  - Or "Any account" if you want others to use it

### 4. Update Configuration

1. **Get your App ID**:
   - After creating the app, copy the "App ID" from the app settings page
   - In `src/kanban.js`, replace `YOUR_GITHUB_APP_ID` with your actual App ID

2. **Get your App Name**:
   - Copy the app name (e.g., `dashban-app`)
   - In `src/kanban.js`, replace `YOUR_APP_NAME` with your app name

3. **Update Repository Settings**:
   - In `src/kanban.js`, update `GITHUB_CONFIG.owner` and `GITHUB_CONFIG.repo` 

### 5. Install the App

1. **Install on your repository**:
   - Go to your app's settings page
   - Click "Install App" 
   - Choose your account/organization
   - Select "Selected repositories" and choose your repository

## Usage

1. **Install App**: Click the "Install GitHub App" button
2. **Choose Repository**: Select which repositories to grant access to
3. **Create Token**: Follow the prompt to create a Fine-grained Personal Access Token with Issues permissions
4. **Create Issues**: Use the "Add Issue" form with the "Create GitHub Issue" checkbox enabled

## Security Benefits

✅ **Much Better Security**:
- Users see exactly what permissions you need (only Issues)
- No access to code, pull requests, or other repository data
- Fine-grained permissions instead of broad scopes
- Installation-based access control
- Users can revoke access to specific repositories

✅ **User Trust**:
- Clear permission display during installation
- No "this app can access everything" warnings
- Modern GitHub Apps are preferred by organizations 