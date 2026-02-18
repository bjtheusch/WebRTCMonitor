// stats-actions.js - Handles Close and Refresh button actions for stats.html

document.addEventListener('DOMContentLoaded', function() {
  const closeBtn = document.getElementById('close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => window.close());
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => window.location.reload());
});
