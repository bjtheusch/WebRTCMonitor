# WebRTC Monitor - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐         ┌──────────────────┐              │
│  │   Web Page      │         │  Extension UI    │              │
│  │                 │         ├──────────────────┤              │
│  │ ┌─────────────┐ │         │   Popup          │              │
│  │ │   WebRTC    │ │         │   • Status       │              │
│  │ │ Connections │ │         │   • Stats        │              │
│  │ └──────┬──────┘ │         │   • Actions      │              │
│  │        │        │         └────────┬─────────┘              │
│  │        │        │                  │                         │
│  └────────┼────────┘         ┌────────┴─────────┐              │
│           │                  │  Options Page    │              │
│  ┌────────▼────────┐         │  • Configuration │              │
│  │  Content Script │         │  • Thresholds    │              │
│  │   content.js    │         │  • API Settings  │              │
│  ├─────────────────┤         └──────────────────┘              │
│  │ • Intercept RTC │                  │                         │
│  │ • Collect Stats │                  │                         │
│  │ • Send to BG    │         ┌────────▼─────────┐              │
│  └────────┬────────┘         │ Background SW    │              │
│           │                  │  background.js   │              │
│           │                  ├──────────────────┤              │
│           └─────────────────►│ • Coordinator    │              │
│                              │ • Stats Handler  │              │
│                              │ • Notifications  │              │
│                              └────┬─────┬───────┘              │
│                                   │     │                       │
│         ┌─────────────────────────┘     └────────┐             │
│         │                                        │             │
│  ┌──────▼──────┐  ┌────────────┐  ┌──────────▼──────┐        │
│  │  Database   │  │   WebRTC   │  │ Quality Analyzer│        │
│  │ database.js │  │  Monitor   │  │quality-analyzer │        │
│  ├─────────────┤  │ webrtc-    │  │       .js       │        │
│  │ • Store     │  │ monitor.js │  ├─────────────────┤        │
│  │ • Retrieve  │  ├────────────┤  │ • Analyze RTT   │        │
│  │ • Export    │  │ • Track    │  │ • Check Loss    │        │
│  └──────┬──────┘  │   Peers    │  │ • Detect Issues │        │
│         │         └────────────┘  └─────────────────┘        │
│         │                                                      │
│  ┌──────▼──────────────────────────────────────────┐         │
│  │         Chrome Storage API                       │         │
│  │         storage.local                            │         │
│  └──────────────────────────────────────────────────┘         │
│                       │                                        │
└───────────────────────┼────────────────────────────────────────┘
                        │
                        │ (Optional)
                        ▼
              ┌──────────────────┐
              │   Backend API    │
              ├──────────────────┤
              │ • Config         │
              │ • Data Upload    │
              │ • Health Check   │
              └──────────────────┘
```

## Data Flow

### 1. WebRTC Connection Detection

```
User Visits Site
       │
       ▼
Content Script Intercepts
RTCPeerConnection()
       │
       ▼
Track Connection
       │
       ▼
Collect Stats (every 2s)
       │
       ▼
Send to Background
```

### 2. Stats Processing

```
Background Receives Stats
       │
       ▼
Quality Analyzer
Evaluates Metrics
       │
       ├──► Good Quality
       │         │
       │         ▼
       │    Update Badge (Green)
       │
       ├──► Fair Quality
       │         │
       │         ▼
       │    Update Badge (Yellow)
       │
       └──► Poor Quality
                 │
                 ▼
            Update Badge (Red)
                 │
                 ▼
         Send Notification
```

### 3. Data Storage

```
Stats Received
       │
       ▼
Add Metadata
(timestamp, quality, etc)
       │
       ▼
Store in Database
       │
       ├──► Keep last 1000
       │
       └──► Mark for upload
```

### 4. API Integration (Optional)

```
Timer Triggers
       │
       ▼
Get Pending Data
       │
       ▼
Upload to API
       │
       ├──► Success
       │         │
       │         ▼
       │    Mark Uploaded
       │
       └──► Failure
                 │
                 ▼
            Retry Later
```

## Component Interactions

### Content Script ↔ Background

```javascript
// Content Script sends stats
chrome.runtime.sendMessage({
  type: 'webrtc-stats',
  stats: statsData
});

// Background processes and responds
response => { success: true }
```

### Popup ↔ Background

```javascript
// Popup requests data
chrome.runtime.sendMessage({
  type: 'get-stats'
});

// Background returns recent stats
response => {
  success: true,
  stats: [...]
}
```

### Background ↔ Storage

```javascript
// Save stats
await chrome.storage.local.set({
  tables: { stats: [...] }
});

// Retrieve stats
const data = await chrome.storage.local.get('tables');
```

### Background ↔ API (Optional)

```javascript
// Upload data
await fetch(apiEndpoint + '/api/stats', {
  method: 'POST',
  body: JSON.stringify(data)
});

// Fetch configuration
const config = await fetch(apiEndpoint + '/api/config');
```

## Module Dependencies

```
background.js
├── database.js
│   └── chrome.storage.local
├── api-client.js
│   └── fetch API
├── webrtc-monitor.js
│   └── chrome.debugger (future)
└── quality-analyzer.js

content.js
└── RTCPeerConnection (native)

popup.js
├── chrome.runtime.sendMessage
└── chrome.storage.local

options.js
└── chrome.storage.local
```

## State Management

### Configuration State
- Stored in: `chrome.storage.local['config']`
- Accessed by: background, popup, options
- Updated by: options page, API fetch

### Stats State
- Stored in: `chrome.storage.local['tables']['stats']`
- Accessed by: background, popup, database
- Updated by: background (from content script)

### Connection State
- Stored in: background service worker memory
- Accessed by: background only
- Lifecycle: Per-session (cleared on restart)

## Error Handling

```
Try Operation
    │
    ├──► Success
    │         │
    │         ▼
    │    Continue
    │
    └──► Error
              │
              ├──► Log to Console
              │
              ├──► Update UI (if applicable)
              │
              └──► Return Error Response
```

## Performance Characteristics

- **Startup Time**: < 100ms
- **Stats Collection**: Every 2 seconds
- **Memory Usage**: ~5-10 MB
- **CPU Usage**: < 1%
- **Storage**: ~1 KB per stats entry
- **Network**: Only API uploads (if enabled)

## Security Boundaries

```
┌─────────────────────────────────────┐
│         User's Browser              │
│                                     │
│  ┌──────────────────────────────┐  │
│  │    Content Script            │  │
│  │    (Isolated)                │  │
│  └───────────┬──────────────────┘  │
│              │ Message Passing      │
│  ┌───────────▼──────────────────┐  │
│  │    Background Service Worker │  │
│  │    (Extension Context)       │  │
│  └───────────┬──────────────────┘  │
│              │                      │
│  ┌───────────▼──────────────────┐  │
│  │    Chrome Storage API        │  │
│  │    (Local, Encrypted)        │  │
│  └──────────────────────────────┘  │
│                                     │
└─────────────┬───────────────────────┘
              │ HTTPS (Optional)
              ▼
    ┌──────────────────┐
    │   Backend API    │
    │  (User's Server) │
    └──────────────────┘
```

## Scalability Considerations

1. **Storage Limit**: 10MB (chrome.storage.local)
   - Holds ~10,000 stats entries
   - Auto-cleanup after 1,000 entries

2. **Stats Collection Rate**: 2 seconds
   - Configurable in code
   - Balance between accuracy and performance

3. **Concurrent Connections**: No limit
   - Tracks all WebRTC connections on all tabs
   - Uses Map for efficient lookups

4. **API Upload Batch Size**: Unlimited
   - Sends all pending stats
   - Should add pagination for production

## Extension Lifecycle

```
Installation
    │
    ▼
Initialize
    │
    ├──► Set Default Config
    ├──► Create Storage Tables
    └──► Register Listeners
    │
    ▼
Active (Running)
    │
    ├──► Monitor WebRTC
    ├──► Collect Stats
    ├──► Analyze Quality
    └──► Store Data
    │
    ▼
Reload/Update
    │
    └──► Re-initialize
    │
    ▼
Uninstall
    │
    └──► Clean Up Storage
```

## Future Architecture Enhancements

1. **SQL.js Integration**: Replace chrome.storage with proper SQLite
2. **Web Worker**: Offload heavy processing
3. **IndexedDB**: Alternative to chrome.storage for larger datasets
4. **Service Worker Caching**: Offline support
5. **WebSocket**: Real-time API communication

---

**Total Lines of Code**: ~2,200  
**JavaScript Modules**: 7  
**UI Components**: 2  
**Documentation Files**: 6
