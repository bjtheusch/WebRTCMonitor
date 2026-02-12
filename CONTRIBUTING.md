# Contributing to WebRTC Monitor

Thank you for your interest in contributing to WebRTC Monitor! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/WebRTCMonitor.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit with clear messages: `git commit -m "Add feature: description"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

1. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the repository directory

2. Make changes to the code

3. Reload the extension to test:
   - Go to `chrome://extensions/`
   - Click the reload icon on the WebRTC Monitor extension

## Project Structure

- **manifest.json**: Extension configuration
- **background.js**: Background service worker
- **content.js**: Content script for WebRTC interception
- **database.js**: Local storage manager
- **api-client.js**: API communication
- **webrtc-monitor.js**: WebRTC tracking
- **quality-analyzer.js**: Connection quality analysis
- **popup.html/css/js**: Extension popup
- **options.html/css/js**: Settings page
- **icons/**: Extension icons

## Coding Standards

### JavaScript Style

- Use ES6+ features (const, let, arrow functions, async/await)
- Use 2 spaces for indentation
- Use single quotes for strings
- Add JSDoc comments for functions
- Keep functions small and focused
- Use meaningful variable names

### Example

```javascript
/**
 * Analyzes WebRTC connection quality
 * @param {Object} stats - WebRTC statistics
 * @returns {Object} Quality analysis result
 */
async function analyzeQuality(stats) {
  const metrics = extractMetrics(stats);
  const issues = detectIssues(metrics);
  return {
    status: determineStatus(issues),
    metrics,
    issues
  };
}
```

### HTML/CSS Style

- Use semantic HTML5 elements
- Keep CSS organized and modular
- Use flexbox/grid for layouts
- Follow mobile-first approach
- Maintain consistent spacing

## Testing

Before submitting a PR:

1. **Manual Testing**:
   - Install the extension locally
   - Visit WebRTC-enabled sites (Google Meet, Zoom, etc.)
   - Verify stats are collected
   - Check notifications work
   - Test all popup buttons
   - Verify settings save correctly

2. **Test Different Scenarios**:
   - Good connection quality
   - Poor connection quality (simulate with network throttling)
   - Multiple tabs with WebRTC
   - Extension reload
   - Browser restart

3. **Browser Console**:
   - Check for JavaScript errors
   - Verify no console warnings

## Pull Request Guidelines

### PR Title

Use clear, descriptive titles:
- ✅ "Add audio quality metrics to analyzer"
- ✅ "Fix notification permission handling"
- ❌ "Update code"
- ❌ "Fix bug"

### PR Description

Include:
- **What**: What changes were made
- **Why**: Why these changes were needed
- **How**: How to test the changes
- **Screenshots**: For UI changes

### Example PR Description

```markdown
## What
Added support for analyzing audio quality metrics including audio level and echo detection.

## Why
Users need visibility into audio-specific issues that affect call quality.

## How to Test
1. Load the extension
2. Join a video call
3. Open the popup
4. Verify audio metrics are displayed

## Screenshots
[Include screenshot of new audio metrics]
```

## Feature Requests

To request a feature:
1. Check existing issues to avoid duplicates
2. Open a new issue with:
   - Clear description of the feature
   - Use case / motivation
   - Proposed implementation (optional)

## Bug Reports

To report a bug:
1. Check existing issues to avoid duplicates
2. Open a new issue with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Browser version
   - Extension version
   - Console errors (if any)

## Areas for Contribution

### High Priority

- [ ] SQL.js integration for proper SQLite support
- [ ] Advanced stats visualization
- [ ] TURN server connectivity testing
- [ ] Automated tests

### Medium Priority

- [ ] Historical data analysis
- [ ] Network topology visualization
- [ ] ICE candidate analysis
- [ ] Video/audio quality metrics

### Documentation

- [ ] API integration examples
- [ ] Troubleshooting guide
- [ ] User guide with screenshots
- [ ] Developer tutorials

## Questions?

Feel free to open an issue with the "question" label if you need help or clarification.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
