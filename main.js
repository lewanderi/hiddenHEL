// ---------- Supabase ----------

const SUPABASE_URL = 'https://oycvxtvlhtajrnvddlhp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Y3Z4dHZsaHRhanJudmRkbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzkzNTcsImV4cCI6MjA5MjU1NTM1N30.yBfTpwV9ixF0ImfovAx1CHVLgDMRBc21u3rCB3QMFZk';

async function fetchEvents() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?status=eq.approved&select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const data = await res.json();

  // Map Supabase fields to the format the rest of the code expects
  return data.map(e => ({
    id: e.id,
    title: e.title,
    date: e.date,
    dateLabel: formatDateLabel(e.date),
    time: e.time || '',
    end_time: e.end_time || null,
    desc: e.description || '',
    location: e.location_name || '',
    lat: e.lat,
    lng: e.lng,
    link: e.link || null,
    is_free: e.is_free ?? null,
    signup_required: e.signup_required ?? false
  }));
}

function formatDateLabel(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';

  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  return `${weekday}, ${d.getDate()}.${d.getMonth() + 1}.`;
}

// ---------- Filtering ----------

function getFilteredEvents(filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();

  const daysUntilSat = (6 - dayOfWeek + 7) % 7;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + daysUntilSat);

  const friday = new Date(saturday);
  friday.setDate(saturday.getDate() - 1);

  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - dayOfWeek));

  return events.filter(e => {
    const d = new Date(e.date);
    if (d < today) return false;
    if (filter === 'today')   return d >= today && d < new Date(today.getTime() + 86400000);
    if (filter === 'weekend') return d >= friday && d <= new Date(sunday.getTime() + 86400000);
    if (filter === 'week')    return d >= today && d <= endOfWeek;
    return true;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ---------- Map setup ----------

const map = L.map('map', {
  center: [60.172, 24.945],
  zoom: 13,
  zoomControl: false
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// ---------- Markers ----------

const markers = {};
const clusterGroup = L.markerClusterGroup({
  maxClusterRadius: 40,
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  iconCreateFunction(cluster) {
    const count = cluster.getChildCount();
    return L.divIcon({
      className: '',
      html: `<div class="cluster-icon">${count}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }
});
map.addLayer(clusterGroup);

function createMarkerIcon(active) {
  const size = active ? 20 : 16;
  const border = active ? '#fff' : 'rgba(255,133,36,0.4)';
  return L.divIcon({
    className: '',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: #fc90e0;
      border-radius: 50%;
      border: 2px solid ${border};
      opacity: ${active ? 1 : 0.75};
      transition: all 0.15s;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function renderMarkers(filtered) {
  clusterGroup.clearLayers();
  Object.keys(markers).forEach(k => delete markers[k]);

  filtered.forEach(e => {
    const marker = L.marker([e.lat, e.lng], {
      icon: createMarkerIcon(activeId === e.id)
    });
    clusterGroup.addLayer(marker);

const freeTag = e.is_free === true  ? '<span class="event-tag event-tag-free">FREE</span>'
                : e.is_free === false ? '<span class="event-tag event-tag-paid">PAID</span>'
                : '';
    const signupTag = e.signup_required ? '<span class="event-tag event-tag-signup">SIGNUP</span>' : '';

    marker.bindPopup(`
      <div class="popup-inner">
        <div class="popup-meta">
          <div class="popup-date-badge">${new Date(e.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })} ${e.date.split('-').reverse().join('.')}</div>
          ${e.time ? `<div class="popup-time-box"><div class="popup-time">${e.time}${e.end_time ? '–' + e.end_time : ''}</div></div>` : ''}
        </div>
        <div class="popup-title">${e.title}</div>
        <div class="popup-desc">${e.desc}</div>
        <a href="https://www.google.com/maps?q=${e.lat},${e.lng}" target="_blank" class="popup-location">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin-icon lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
          ${e.location}
        </a>
        <div class="popup-footer">
          ${e.link ? `<a href="${e.link}" target="_blank" class="popup-link-btn">Event link <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>` : ''}
          ${freeTag}${signupTag}
        </div>
      </div>
    `, { className: 'custom-popup', closeButton: false });

    marker.on('click', () => selectEvent(e.id));
    markers[e.id] = marker;
  });
}

// ---------- List ----------

function renderList(filtered) {
  const panel = document.getElementById('list-panel');

  if (filtered.length === 0) {
    panel.innerHTML = '<div class="empty-state">Ei tapahtumia tällä ajanjaksolla.</div>';
    return;
  }

  panel.innerHTML = filtered.map(e => {
    const freeTag = e.is_free === true  ? '<span class="event-tag event-tag-free">FREE</span>'
                  : e.is_free === false ? '<span class="event-tag event-tag-paid">PAID</span>'
                  : '';
    const signupTag = e.signup_required ? '<span class="event-tag event-tag-signup">SIGNUP</span>' : '';
    return `
    <div class="event-card ${activeId === e.id ? 'active' : ''}" data-id="${e.id}">
      <div class="card-date">${e.dateLabel} <span class="card-time">${e.time}${e.end_time ? '–' + e.end_time : ''}</span></div>
      <div class="card-title">${e.title}</div>
      <div class="card-desc">${e.desc}</div>
      <div class="card-location">${e.location}${freeTag}${signupTag}</div>
    </div>
  `;
  }).join('');

  panel.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('click', () => selectEvent(parseInt(card.dataset.id)));
  });
}

// ---------- State ----------

let activeFilter = 'all';
let activeId = null;
let events = [];

function selectEvent(id) {
  activeId = id;
  const filtered = getFilteredEvents(activeFilter);
  renderList(filtered);

  Object.entries(markers).forEach(([mid, m]) => {
    m.setIcon(createMarkerIcon(parseInt(mid) === id));
  });

  if (markers[id]) {
    const layout = document.getElementById('layout');
    if (layout.classList.contains('list-mode')) {
      layout.classList.remove('list-mode');
      document.querySelectorAll('.toggle-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === 'map');
      });
      map.invalidateSize();
    }
    clusterGroup.zoomToShowLayer(markers[id], () => {
      markers[id].openPopup();
    });
  }
}

function render() {
  const filtered = getFilteredEvents(activeFilter);
  renderList(filtered);
  renderMarkers(filtered);
}

// ---------- Auto-popup on zoom ----------

map.on('zoomend', () => {
  if (map.getZoom() < 15) { map.closePopup(); return; }

  const bounds = map.getBounds();
  const visible = Object.entries(markers).filter(([, m]) => {
    return clusterGroup.getVisibleParent(m) === m && bounds.contains(m.getLatLng());
  });

  if (visible.length === 1) {
    visible[0][1].openPopup();
  }
});

// ---------- Filter buttons ----------

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    activeId = null;
    render();
  });
});

// ---------- Mobile view toggle ----------

document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const layout = document.getElementById('layout');
    layout.classList.toggle('list-mode', btn.dataset.view === 'list');
    if (btn.dataset.view === 'map') map.invalidateSize();
  });
});

// ---------- Init ----------

fetchEvents().then(data => {
  events = data;
  render();
});