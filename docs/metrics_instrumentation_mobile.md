# Mobile Metrics Instrumentation Guide

## Overview
This guide shows how to emit telemetry from React Native apps to Prometheus via a beacon/analytics service.

## Firebase Crashlytics Integration

### Setup
```bash
npm install @react-native-firebase/app @react-native-firebase/crashlytics
npx react-native link
```

### Track Crashes
```javascript
import { firebase } from '@react-native-firebase/crashlytics';

try {
  // risky operation
} catch (error) {
  // This auto-reports to Crashlytics and Firebase
  firebase.crashlytics().recordError(error);
}
```

## Custom Analytics Service

Create a custom metrics service:
```javascript
// src/services/metrics.js
class MetricsService {
  constructor() {
    this.beaconUrl = 'https://your-api.com/metrics/beacon';
    this.sessionId = generateSessionId();
    this.isCanaary = featureFlags.get('canary_release');
  }

  // Session lifecycle
  onSessionStart() {
    this.reportEvent('mobile_session_start', {
      app: 'ams',
      platform: Platform.OS,
      canary: this.isCanary,
      version: AppVersion.getVersion()
    });
  }

  onSessionEnd() {
    this.reportEvent('mobile_session_end', {
      duration: time.now() - this.sessionStartTime
    });
  }

  // Crash reporting (in addition to Crashlytics)
  onCrash(error) {
    this.reportEvent('mobile_crash', {
      error: error.message,
      stack: error.stack,
      canary: this.isCanary
    });
  }

  // Business metrics
  onCheckoutStarted() {
    this.reportEvent('checkout_started');
  }

  onCheckoutCompleted() {
    this.reportEvent('checkout_completed');
  }

  onJobSubmitted() {
    this.reportEvent('job_submitted');
  }

  // Helper
  reportEvent(eventName, data = {}) {
    fetch(this.beaconUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        ...data
      })
    }).catch(err => console.warn('Metrics send failed:', err));
  }
}

export default new MetricsService();
```

### Usage in App
```javascript
import metrics from './services/metrics';

// In app.js
useEffect(() => {
  metrics.onSessionStart();
  return () => metrics.onSessionEnd();
}, []);

// In checkout flow
const handleCheckout = async () => {
  metrics.onCheckoutStarted();
  try {
    await processCheckout();
    metrics.onCheckoutCompleted();
  } catch (err) {
    // Crashlytics auto-reports
    firebase.crashlytics().recordError(err);
  }
};
```

## Backend Beacon Receiver

Add to Express app to receive mobile metrics:
```javascript
const express = require('express');
const { metrics } = require('./health_endpoints');

app.post('/metrics/beacon', (req, res) => {
  const { event, sessionId, app, platform, canary, ...data } = req.body;

  switch (event) {
    case 'mobile_crash':
      metrics.mobileCrashes
        .labels(app, platform, canary ? 'true' : 'false')
        .inc();
      break;
    case 'checkout_completed':
      metrics.checkoutCompleted.labels(app).inc();
      break;
    case 'job_submitted':
      metrics.jobSubmitted.labels(app).inc();
      break;
  }

  res.status(200).json({ received: true });
});
```

## Key Metrics

| Event | Labels | Purpose |
|-------|--------|---------|
| mobile_session_start | app, platform, canary, version | Session tracking |
| mobile_crash | app, platform, canary | Crash rate monitoring |
| checkout_started | app | Conversion funnel |
| checkout_completed | app | Successful conversions |
| job_submitted | app | Business activity |
