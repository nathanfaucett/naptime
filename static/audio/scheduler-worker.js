/* simple scheduler worker
   Receives:
     - { type: 'schedule', events: [{ id?, delayMs, action, payload? }] }
     - { type: 'cancel', ids: [id] }
     - { type: 'clearAll' }
     - { type: 'ping' }
   Posts:
     - { type: 'event', event }
     - { type: 'pong', now }
*/

const timers = new Map();

function makeId(prefix = 'evt') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

self.addEventListener('message', (e) => {
  const data = e.data;
  if (!data) return;

  if (data.type === 'schedule') {
    const events = data.events || [];
    for (const ev of events) {
      const delayMs = Math.max(0, ev.delayMs || 0);
      const id = ev.id || makeId();
      const timer = setTimeout(() => {
        try {
          self.postMessage({ type: 'event', event: { ...ev, id } });
        } finally {
          timers.delete(id);
        }
      }, delayMs);
      timers.set(id, timer);
    }
  } else if (data.type === 'cancel') {
    const ids = data.ids || [];
    for (const id of ids) {
      const t = timers.get(id);
      if (t) {
        clearTimeout(t);
        timers.delete(id);
      }
    }
  } else if (data.type === 'clearAll') {
    for (const [id, t] of timers.entries()) {
      clearTimeout(t);
      timers.delete(id);
    }
  } else if (data.type === 'ping') {
    self.postMessage({ type: 'pong', now: Date.now() });
  }
});
