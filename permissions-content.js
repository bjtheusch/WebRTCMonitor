// permissions-content.js - Checks mic/camera permissions in the page context
(async function() {
  try {
    const micPerm = await navigator.permissions.query({ name: 'microphone' });
    const camPerm = await navigator.permissions.query({ name: 'camera' });
    window.postMessage({
      source: 'webrtc-monitor-permissions',
      type: 'permissions-result',
      microphone: micPerm.state,
      camera: camPerm.state
    }, '*');
  } catch (e) {
    window.postMessage({
      source: 'webrtc-monitor-permissions',
      type: 'permissions-result',
      error: e.message
    }, '*');
  }
})();
