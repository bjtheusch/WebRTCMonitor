# Quick Start Guide - WebRTC Monitor

## Installation (30 seconds)

1. **Open Chrome Extensions**
   - Type `chrome://extensions/` in the address bar
   - Press Enter

2. **Enable Developer Mode**
   - Toggle the switch in the top-right corner

3. **Load Extension**
   - Click "Load unpacked" button
   - Select the `WebRTCMonitor` directory
   - Click "Select Folder"

4. **Verify Installation**
   - Look for the WebRTC Monitor icon in the toolbar
   - If not visible, click the puzzle piece icon and pin it

## First Time Setup (1 minute)

1. **Click the extension icon**
2. **Click "Settings" button**
3. **Configure (optional)**:
   - API Endpoint: Leave blank unless you have a backend server
   - Quality Thresholds: Use defaults or customize
   - Notifications: Enable to get alerts

4. **Click "Save Settings"**

## Using the Extension (2 minutes)

### Test with the included demo page:

1. **Open test.html**
   - Navigate to the extension directory
   - Open `test.html` in Chrome
   - Or visit any WebRTC site (Google Meet, Zoom, etc.)

2. **Start Camera**
   - Click "Start Camera" button
   - Allow camera/microphone permissions

3. **Start Call**
   - Click "Start Call" button
   - WebRTC connection will be established

4. **View Stats**
   - Click the extension icon
   - See real-time connection statistics
   - Quality status, RTT, packet loss, jitter

### Understanding the Popup:

```
┌─────────────────────────────────────┐
│  WebRTC Monitor          [Good]     │  ← Status Badge
├─────────────────────────────────────┤
│  Connection Status                  │
│  Quality: GOOD                      │  ← Current Quality
│  RTT: 25ms                          │  ← Round Trip Time
│  Packet Loss: 0.5%                  │  ← Packet Loss %
│  Jitter: 15ms                       │  ← Jitter
├─────────────────────────────────────┤
│  Recent Activity                    │
│  10:30:45 - GOOD: Connection...     │  ← Recent Stats
│  10:30:43 - GOOD: Connection...     │
├─────────────────────────────────────┤
│  Quick Actions                      │
│  [Check Permissions] [Clear Cache]  │  ← Helper Tools
│  [Test API]         [View Stats]    │
├─────────────────────────────────────┤
│  Database Info                      │
│  Total Records: 42                  │  ← Stored Stats
│  Pending Upload: 42                 │
├─────────────────────────────────────┤
│            [Settings]               │
└─────────────────────────────────────┘
```

## Quality Indicators

### Badge Colors:
- 🟢 **Green (G)** = Good quality
- 🟡 **Yellow (F)** = Fair quality  
- 🔴 **Red (P)** = Poor quality
- ⚪ **Gray (U)** = Unknown

### What Gets Monitored:
- **RTT (Round Trip Time)**: Network latency
  - Good: < 200ms
  - Fair: 200-400ms
  - Poor: > 400ms

- **Packet Loss**: Lost data packets
  - Good: < 5%
  - Fair: 5-10%
  - Poor: > 10%

- **Jitter**: Variation in packet timing
  - Good: < 30ms
  - Fair: 30-60ms
  - Poor: > 60ms

## Quick Actions

### Check Permissions
- Verifies microphone and camera access
- Shows permission status
- Helps troubleshoot permission issues

### Clear Cache
- Clears browser cache completely
- Useful for resolving connection issues
- Use with caution (clears all cached data)

### Test API
- Tests connectivity to configured API endpoint
- Shows connection status and response
- Only available if API endpoint is configured

### View Stats
- Opens detailed statistics view (coming soon)
- Shows historical data
- Export options

## Settings Configuration

### API Configuration
- **API Endpoint URL**: Your backend server URL
- **Enable Data Upload**: Allow uploading stats to API
- **Automatic Upload**: Upload data periodically
- **Upload Interval**: How often to upload (seconds)

### Quality Thresholds
- **RTT Threshold**: Maximum acceptable latency (ms)
- **Packet Loss Threshold**: Maximum acceptable loss (%)
- **Jitter Threshold**: Maximum acceptable jitter (ms)

### Notifications
- **Enable Notifications**: Show desktop alerts for poor quality

### Data Management
- **Export Data**: Download all stats as JSON
- **Clear All Data**: Delete all stored statistics

## Troubleshooting

### Extension not detecting connections
1. Refresh the webpage
2. Ensure WebRTC is actually being used
3. Check console for errors (F12 → Console)

### No notifications appearing
1. Enable notifications in extension settings
2. Check Chrome notification permissions
3. Verify OS notification settings

### Stats not updating
1. Click extension icon to refresh
2. Check that connection is active
3. Look for errors in browser console

### API upload failing
1. Verify API endpoint URL is correct
2. Test connection using "Test API" button
3. Check API server is running and accessible

## Advanced Usage

### Custom API Integration
1. Set up your backend server (see API.md)
2. Configure API endpoint in settings
3. Enable data upload and automatic upload
4. Stats will be uploaded periodically

### Data Export
1. Click extension icon → Settings
2. Scroll to "Data Management"
3. Click "Export Data"
4. JSON file will download with all stats

### Custom Thresholds
1. Open Settings
2. Adjust threshold values
3. Click Save Settings
4. New thresholds take effect immediately

## Best Practices

✅ **DO**:
- Keep the extension updated
- Monitor notifications for quality issues
- Export data periodically for backup
- Configure thresholds based on your needs

❌ **DON'T**:
- Don't clear cache unless necessary
- Don't disable notifications without reason
- Don't set thresholds too low (false alarms)

## Getting Help

- 📖 **Documentation**: See README.md for detailed info
- 🐛 **Report Bugs**: Open issue on GitHub
- 💡 **Feature Requests**: Open issue on GitHub
- 🤝 **Contributing**: See CONTRIBUTING.md

## Next Steps

1. ✅ **Installation Complete**
2. ✅ **Test with demo page**
3. ⏭️ **Use on real WebRTC sites**
4. ⏭️ **Configure settings as needed**
5. ⏭️ **Monitor your connections!**

---

**Need more help?** Check out:
- 📖 [README.md](README.md) - Full documentation
- 🔧 [INSTALL.md](INSTALL.md) - Detailed installation
- 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) - How it works
- 🔌 [API.md](API.md) - API integration guide

**Happy monitoring! 🎉**
