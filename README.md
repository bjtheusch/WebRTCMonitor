# WebRTC Monitor

A Chrome extension that monitors WebRTC connections in real-time, tracks connection quality, and assists with troubleshooting.

## Features

- **Real-time WebRTC Monitoring**: Automatically detects and monitors WebRTC connections on any webpage
- **Connection Quality Analysis**: Analyzes RTT, packet loss, jitter, and other metrics to determine connection quality
- **Desktop Notifications**: Alerts users when connection quality degrades
- **Local Data Storage**: Stores statistics locally using Chrome's storage API (SQLite-like structure)
- **API Integration**: Optionally uploads data to a backend API and fetches configuration
- **Endpoint Testing**: Check if API endpoints are accessible
- **Permission Management**: Helper tools to check and request microphone/camera permissions
- **Cache Management**: Ability to fully clear browser cache to resolve connection issues
- **Configurable Thresholds**: Customize quality thresholds for RTT, packet loss, and jitter

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/bjtheusch/WebRTCMonitor.git
   cd WebRTCMonitor
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the repository directory

5. The WebRTC Monitor extension should now be installed and active

## Usage

### Basic Usage

1. Click the extension icon in Chrome's toolbar to open the popup
2. The popup displays:
   - Current connection quality status
   - Real-time metrics (RTT, packet loss, jitter)
   - Recent activity log
   - Quick action buttons
   - Database statistics

3. Visit any webpage that uses WebRTC (e.g., video conferencing sites)
4. The extension will automatically detect and monitor WebRTC connections
5. Quality notifications will appear if connection degrades

### Configuration

1. Click the extension icon and select "Settings"
2. Configure:
   - **API Endpoint**: Backend server URL for data upload and configuration
   - **Data Upload**: Enable/disable automatic data upload
   - **Upload Interval**: How often to upload data (60-3600 seconds)
   - **Quality Thresholds**: Customize RTT, packet loss, and jitter thresholds
   - **Notifications**: Enable/disable desktop notifications

### Quick Actions

- **Check Permissions**: Verify microphone and camera permissions
- **Clear Cache**: Clear browser cache to resolve connection issues
- **Test API**: Test connectivity to the configured API endpoint
- **View Stats**: Open detailed statistics view

### Data Management

- **Export Data**: Download all stored statistics as JSON
- **Clear All Data**: Delete all stored statistics (cannot be undone)

## Architecture

### Components

1. **manifest.json**: Extension configuration and permissions
2. **background.js**: Service worker that coordinates monitoring and data management
3. **content.js**: Content script injected into pages to intercept WebRTC connections
4. **database.js**: Data storage manager using Chrome's storage API
5. **api-client.js**: API communication layer
6. **webrtc-monitor.js**: WebRTC connection tracking
7. **quality-analyzer.js**: Connection quality analysis engine
8. **popup.html/css/js**: Extension popup interface
9. **options.html/css/js**: Settings page

### Data Flow

1. Content script intercepts `RTCPeerConnection` creation
2. Stats are collected periodically from active connections
3. Stats are sent to the background service worker
4. Quality analyzer evaluates connection quality
5. Data is logged to local storage
6. Notifications are shown if quality is poor
7. Data is optionally uploaded to API at configured intervals

## API Integration

The extension can integrate with a backend API for:

### Configuration Endpoint
```
GET /api/config
```
Returns configuration parameters that override local settings.

### Data Upload Endpoint
```
POST /api/stats
```
Accepts an array of WebRTC statistics entries.

### Health Check Endpoint
```
GET /api/health
```
Simple endpoint to verify API connectivity.

## Development

### File Structure
```
WebRTCMonitor/
├── manifest.json           # Extension manifest
├── background.js           # Background service worker
├── content.js             # Content script
├── database.js            # Database manager
├── api-client.js          # API client
├── webrtc-monitor.js      # WebRTC monitor
├── quality-analyzer.js    # Quality analyzer
├── popup.html             # Popup UI
├── popup.css             # Popup styles
├── popup.js              # Popup logic
├── options.html          # Options page UI
├── options.css           # Options page styles
├── options.js            # Options page logic
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

### Quality Thresholds

Default thresholds (configurable in settings):
- **RTT**: 200ms (warning), 400ms (poor)
- **Packet Loss**: 5% (warning), 10% (poor)
- **Jitter**: 30ms (warning), 60ms (poor)

### Permissions

The extension requires the following permissions:
- `storage`: Store configuration and statistics locally
- `notifications`: Show desktop notifications
- `tabs`: Access tab information for monitoring
- `webRequest`: Monitor network requests
- `browsingData`: Clear cache when requested
- `debugger`: Access WebRTC internals (optional, not currently used)
- `<all_urls>`: Inject content script into all pages

## Privacy

- All data is stored locally by default
- Data upload to API is optional and disabled by default
- No data is collected without user consent
- Users can export and delete all stored data at any time

## Troubleshooting

### Extension not detecting WebRTC connections
- Ensure the extension has permission to access the website
- Refresh the page after installing the extension
- Check the browser console for errors

### Notifications not appearing
- Check that notifications are enabled in extension settings
- Verify Chrome notification permissions for the extension
- Ensure Desktop notifications are enabled in OS settings

### API upload failing
- Verify the API endpoint URL is correct
- Test API connectivity using the "Test API" button
- Check browser console and API server logs for errors

## Future Enhancements

- [ ] Support for SQLite via SQL.js or WASM
- [ ] Advanced stats visualization
- [ ] Historical data analysis
- [ ] Network topology visualization
- [ ] TURN server connectivity testing
- [ ] ICE candidate analysis
- [ ] Video quality metrics (resolution, framerate)
- [ ] Audio quality metrics (audio level, echo)

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
