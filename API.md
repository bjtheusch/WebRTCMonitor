# WebRTC Monitor - API Specification

This document describes the API endpoints that the WebRTC Monitor extension can integrate with.

## Base URL

All endpoints are relative to the configured API endpoint URL (e.g., `https://api.example.com`).

## Authentication

Currently, the extension does not implement authentication. For production use, you should add:
- API keys
- OAuth tokens
- JWT authentication

## Endpoints

### 1. Get Configuration

Retrieve configuration parameters for the extension.

**Endpoint:** `GET /api/config`

**Response:**
```json
{
  "uploadInterval": 300000,
  "qualityThreshold": {
    "rtt": 200,
    "packetLoss": 5,
    "jitter": 30
  },
  "enableNotifications": true,
  "enableDataUpload": true
}
```

**Status Codes:**
- `200 OK`: Configuration retrieved successfully
- `500 Internal Server Error`: Server error

### 2. Upload Statistics

Upload WebRTC statistics data to the server.

**Endpoint:** `POST /api/stats`

**Request Body:**
```json
[
  {
    "id": 1234567890.123,
    "timestamp": 1234567890000,
    "tabId": 123,
    "stats": {
      "connectionId": "webrtc-1234567890-abc123",
      "stats": {
        "timestamp": 1234567890000,
        "connectionState": "connected",
        "iceConnectionState": "connected",
        "candidates": [
          {
            "type": "candidate-pair",
            "state": "succeeded",
            "currentRoundTripTime": 0.025,
            "availableOutgoingBitrate": 3000000
          }
        ],
        "inbound": [
          {
            "type": "inbound-rtp",
            "mediaType": "video",
            "packetsReceived": 1000,
            "packetsLost": 5,
            "jitter": 0.015
          }
        ],
        "outbound": [
          {
            "type": "outbound-rtp",
            "mediaType": "video",
            "packetsSent": 1000,
            "bytesSent": 500000
          }
        ]
      }
    },
    "quality": {
      "status": "good",
      "message": "Connection quality is good",
      "metrics": {
        "rtt": 25,
        "packetLoss": 0.5,
        "jitter": 15
      },
      "issues": []
    },
    "uploaded": false
  }
]
```

**Response:**
```json
{
  "success": true,
  "received": 1,
  "message": "Statistics uploaded successfully"
}
```

**Status Codes:**
- `200 OK`: Data uploaded successfully
- `400 Bad Request`: Invalid request body
- `500 Internal Server Error`: Server error

### 3. Health Check

Simple endpoint to verify API connectivity.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890000
}
```

**Status Codes:**
- `200 OK`: API is healthy
- `503 Service Unavailable`: API is down

## Data Models

### Stats Entry

```typescript
interface StatsEntry {
  id: number;
  timestamp: number;
  tabId: number;
  stats: WebRTCStats;
  quality: QualityAnalysis;
  uploaded: boolean;
  uploadedAt?: number;
}
```

### WebRTC Stats

```typescript
interface WebRTCStats {
  connectionId: string;
  stats: {
    timestamp: number;
    connectionState: string;
    iceConnectionState: string;
    iceGatheringState: string;
    signalingState: string;
    candidates: CandidateStat[];
    inbound: RTPStat[];
    outbound: RTPStat[];
    remote: RemoteRTPStat[];
  };
}
```

### Quality Analysis

```typescript
interface QualityAnalysis {
  status: 'good' | 'fair' | 'poor' | 'unknown';
  message: string;
  metrics: {
    rtt: number | null;
    packetLoss: number | null;
    jitter: number | null;
    bandwidth?: number | null;
    framesDropped?: number | null;
    timestamp: number;
  };
  issues: Issue[];
}
```

### Issue

```typescript
interface Issue {
  severity: 'high' | 'medium' | 'low';
  metric: string;
  value: number;
  threshold: number;
  message: string;
}
```

## Example Implementation

### Node.js/Express Server

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    uploadInterval: 300000,
    qualityThreshold: {
      rtt: 200,
      packetLoss: 5,
      jitter: 30
    },
    enableNotifications: true,
    enableDataUpload: true
  });
});

// Statistics upload endpoint
app.post('/api/stats', (req, res) => {
  const stats = req.body;
  
  // Store stats in database
  console.log(`Received ${stats.length} statistics entries`);
  
  // Process stats...
  
  res.json({
    success: true,
    received: stats.length,
    message: 'Statistics uploaded successfully'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now()
  });
});

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
```

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **CORS**: Configure appropriate CORS headers
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Authentication**: Add API key or token-based authentication
5. **Input Validation**: Validate all incoming data
6. **Data Privacy**: Ensure compliance with privacy regulations

## Rate Limits

Recommended rate limits:
- Configuration endpoint: 10 requests/minute
- Statistics upload: 100 requests/hour
- Health check: 60 requests/minute
