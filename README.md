# Dashban - Everything. One board. 

A modern, responsive Kanban board application built with HTML, TailwindCSS, and JavaScript. Dashban provides an intuitive drag-and-drop interface for effective task management and project tracking.

## Features

### ✨ Core Functionality
- **Drag & Drop**: Seamlessly move tasks between columns (Backlog, In Progress, Review, Done)
- **Add New Tasks**: Create tasks with title, description, priority, and category
- **Task Management**: Each task displays priority level, category, assignee, and progress
- **Real-time Updates**: Column counters update automatically as tasks are moved
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

### 🎨 User Interface
- **Modern Design**: Clean, professional interface using TailwindCSS
- **Visual Feedback**: Hover effects, animations, and drag indicators
- **Color-coded Priority**: High (Red), Medium (Yellow), Low (Green)
- **Category Labels**: Frontend, Backend, Design, Testing, Database, Setup
- **Progress Tracking**: Visual progress bars for in-progress tasks
- **Avatar Integration**: User profile pictures for task assignment

### ⌨️ Keyboard Shortcuts
- `Ctrl/Cmd + N`: Add new task
- `Escape`: Close modal

## 🚀 Deployment

This project includes a GitHub Actions workflow for automatic deployment to GitHub Pages. To enable deployment:

1. Go to your repository's **Settings** tab
2. Navigate to **Pages** in the left sidebar
3. Under **Source**, select **"GitHub Actions"**
4. The workflow will automatically deploy your site when you push to the `main` branch

Your Dashban application will then be available at: `https://yourusername.github.io/dashban`
