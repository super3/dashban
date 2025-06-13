<h1 align="center">
  Dashban
  <br>
</h1>

<h4 align="center">A modern, responsive Kanban board application built with <a href="https://developer.mozilla.org/en-US/docs/Web/HTML">HTML</a>, <a href="https://tailwindcss.com">TailwindCSS</a>, and <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">JavaScript</a>.</h4>

<div align="center">

[![Frontend Build Status](https://img.shields.io/github/actions/workflow/status/super3/dashban/frontend.yml?label=frontend)](https://github.com/super3/dashban/actions/workflows/frontend.yml)
[![Test Status](https://img.shields.io/github/actions/workflow/status/super3/dashban/test.yml?label=tests)](https://github.com/super3/dashban/actions/workflows/test.yml)
[![Coverage Status](https://coveralls.io/repos/github/super3/dashban/badge.svg?branch=main)](https://coveralls.io/github/super3/dashban?branch=main)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?label=license)](https://github.com/super3/dashban/blob/main/LICENSE)

</div>

## Quick Start
```bash
git clone https://github.com/super3/dashban.git && cd dashban
npm install && npm test
```

Open `index.html` in your browser to start using Dashban.

### ⌨️ Keyboard Shortcuts
- `Ctrl/Cmd + N`: Add new task
- `Escape`: Close modal

## 🚀 Frontend Deployment

This project includes a GitHub Actions workflow for automatic deployment to GitHub Pages. To enable deployment:

1. Go to your repository's **Settings** tab
2. Navigate to **Pages** in the left sidebar
3. Under **Source**, select **"GitHub Actions"**
4. The workflow will automatically deploy your site when you push to the `main` branch

Your Dashban application will then be available at: `https://yourusername.github.io/dashban`

## 🔧 GitHub Personal Access Token Setup

To create GitHub issues directly from Dashban:

1. Go to **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Click **"Generate new token"**
3. Select **this repository** as the resource owner
4. Under permissions, grant **"Issues"** with **Read and Write** access
5. Generate the token and add it using the **Add Access Token** button in Dashban
