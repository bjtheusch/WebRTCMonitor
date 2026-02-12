# Quick Installation Guide

## Prerequisites
- Google Chrome or Chromium-based browser (Edge, Brave, etc.)
- Chrome version 88 or higher (for Manifest V3 support)

## Installation Steps

1. **Download the Extension**
   ```bash
   git clone https://github.com/bjtheusch/WebRTCMonitor.git
   cd WebRTCMonitor
   ```

2. **Open Chrome Extensions Page**
   - Open Chrome
   - Navigate to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `WebRTCMonitor` directory
   - Click "Select Folder"

5. **Verify Installation**
   - The WebRTC Monitor icon should appear in the Chrome toolbar
   - If not visible, click the puzzle piece icon and pin it

6. **Grant Permissions**
   - Click the extension icon
   - Review and accept the requested permissions when prompted

## First Use

1. Click the WebRTC Monitor icon in the toolbar
2. Click "Settings" to configure:
   - Set your API endpoint (if using server integration)
   - Adjust quality thresholds
   - Enable/disable notifications

3. Visit a WebRTC-enabled website (e.g., Google Meet, Zoom)
4. The extension will automatically start monitoring

## Troubleshooting

### Extension doesn't load
- Ensure you selected the correct directory (the one containing `manifest.json`)
- Check Chrome version is 88 or higher
- Look for errors on the chrome://extensions page

### No stats appearing
- Refresh the webpage after loading the extension
- Ensure the website actually uses WebRTC
- Check the browser console for errors (F12 → Console)

### Notifications not showing
- Enable notifications in extension settings
- Check Chrome notification permissions (chrome://settings/content/notifications)
- Ensure desktop notifications are enabled in your OS

## Testing the Extension

You can test the extension on these WebRTC-enabled sites:
- https://meet.google.com
- https://zoom.us
- https://whereby.com
- https://jitsi.org/meet
- https://webrtc.github.io/samples/ (WebRTC samples)

## Updating the Extension

1. Pull the latest changes:
   ```bash
   cd WebRTCMonitor
   git pull origin main
   ```

2. Reload the extension:
   - Go to chrome://extensions/
   - Click the reload icon on the WebRTC Monitor card

## Uninstallation

1. Go to chrome://extensions/
2. Click "Remove" on the WebRTC Monitor card
3. Confirm removal

Your stored data will be deleted automatically.
