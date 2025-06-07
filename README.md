# Dashban

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

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server required - runs entirely in the browser

### Installation
1. Clone or download this repository
2. Open `index.html` in your web browser
3. Start managing your tasks!

## Usage

### Adding Tasks
1. Click the **"Add Task"** button in the header
2. Fill in the task details:
   - **Title**: Brief task name
   - **Description**: Detailed task description
   - **Priority**: High, Medium, or Low
   - **Category**: Frontend, Backend, Design, Testing, Database, or Setup
3. Click **"Add Task"** to create the task in the Backlog column

### Moving Tasks
- **Drag and Drop**: Click and drag any task card to move it between columns
- **Visual Feedback**: Tasks rotate slightly when being dragged
- **Auto-save**: Changes are automatically reflected in column counters

### Task Information
Each task card displays:
- Task title and unique ID number
- Detailed description
- Priority level (color-coded badge)
- Category (color-coded badge)
- Assigned user avatar
- Progress bar (for in-progress tasks)
- Completion status (for done tasks)

## Column Structure

### 🗂️ Backlog
- New tasks and planned work
- Gray indicator dot
- Tasks ready to be started

### 🔄 In Progress
- Currently active tasks
- Blue indicator dot
- Shows progress percentage
- Limited WIP (Work in Progress) recommended

### 👁️ Review
- Tasks awaiting review or approval
- Yellow indicator dot
- Ready for quality assurance

### ✅ Done
- Completed tasks
- Green indicator dot
- Archived completed work

## Customization

### Adding New Categories
Edit the `categoryColors` object in `script.js`:
```javascript
const categoryColors = {
    'Frontend': 'bg-indigo-100 text-indigo-800',
    'Backend': 'bg-blue-100 text-blue-800',
    'YourNewCategory': 'bg-purple-100 text-purple-800'
};
```

### Modifying Columns
To add or modify columns:
1. Update the HTML structure in `index.html`
2. Add the column ID to the `columns` array in `script.js`
3. Initialize Sortable for the new column

### Styling Changes
The application uses TailwindCSS classes. Modify styles by:
- Changing Tailwind classes in HTML elements
- Adding custom CSS in the `<style>` section
- Modifying the color schemes for priorities and categories

## Technical Details

### Dependencies
- **TailwindCSS**: For responsive styling and design system
- **SortableJS**: For drag-and-drop functionality
- **Font Awesome**: For icons
- **Unsplash**: For user avatar images

### Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Performance
- Lightweight: ~15KB total size
- Fast loading: CDN-based dependencies
- Smooth animations: Hardware-accelerated CSS transitions

## File Structure
```
dashban/
├── index.html          # Main HTML file
├── script.js           # JavaScript functionality
├── README.md           # Documentation
└── LICENSE             # License file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Future Enhancements

- [ ] Local storage persistence
- [ ] Task due dates and reminders
- [ ] Multiple board support
- [ ] Team collaboration features
- [ ] Export/import functionality
- [ ] Task comments and attachments
- [ ] Time tracking
- [ ] Advanced filtering and search

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Built with modern web technologies for optimal performance
- Designed with user experience and accessibility in mind
- Inspired by popular project management tools

---

**Happy task management! 🚀**