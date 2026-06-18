// ---------- Supabase ----------

const SUPABASE_URL = 'https://oycvxtvlhtajrnvddlhp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Y3Z4dHZsaHRhanJudmRkbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzkzNTcsImV4cCI6MjA5MjU1NTM1N30.yBfTpwV9ixF0ImfovAx1CHVLgDMRBc21u3rCB3QMFZk';

async function fetchEvents() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/public_events?select=id,title,date,end_date,time,end_time,description,location_name,link,lat,lng,is_free,signup_required,category`, {    headers: {
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
    end_date: e.end_date || null,
    dateLabel: formatDateLabel(e.date),
    time: e.time || '',
    end_time: e.end_time || null,
    desc: e.description || '',
    location: e.location_name || '',
    lat: e.lat,
    lng: e.lng,
    link: e.link || null,
    is_free: e.is_free ?? null,
    signup_required: e.signup_required ?? false,
    category: e.category || null
  }));
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function formatEndDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.getDate()}.${d.getMonth() + 1}.`;
}

// ---------- Filtering ----------

function eventEndsAt(e) {
  const base = e.date + 'T';
  if (e.end_time) {
    const end = new Date(base + e.end_time);
    const start = new Date(base + e.time);
    if (end < start) end.setDate(end.getDate() + 1);
    return end;
  }
  return new Date(new Date(base + e.time).getTime() + 3 * 60 * 60 * 1000);
}

function getFilteredEvents(filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = today.getDay();

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - dayOfWeek) % 7);
  endOfWeek.setHours(23, 59, 59, 999);

  return events.filter(e => {
    if (activeCategory !== 'all' && e.category !== activeCategory) return false;

    // For multiday events, check if today falls within the range
    const isMultiday = !!e.end_date;
    if (isMultiday) {
      if (e.end_date < todayStr) return false; // already ended
    } else {
      if (eventEndsAt(e) < now) return false;
    }

    const d = new Date(e.date + 'T12:00:00');
    const tomorrow = new Date(today.getTime() + 86400000);

    if (filter === 'today') {
      if (isMultiday) return e.date <= todayStr && e.end_date >= todayStr;
      return d >= today && d < tomorrow;
    }
    if (filter === 'tomorrow') {
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      if (isMultiday) return e.date <= tomorrowStr && e.end_date >= tomorrowStr;
      return d >= tomorrow && d < new Date(tomorrow.getTime() + 86400000);
    }
    if (filter === 'week') {
      if (isMultiday) return e.date <= endOfWeek.toISOString().split('T')[0] && e.end_date >= todayStr;
      return d >= today && d <= endOfWeek;
    }
    if (filter === 'custom') {
      const startEl = document.getElementById('customStartDate');
      const endEl = document.getElementById('customEndDate');
      if (!startEl || !endEl || !startEl.value || !endEl.value) return false;
      const start = new Date(startEl.value + 'T00:00:00');
      const end = new Date(endEl.value + 'T23:59:59');
      if (isMultiday) return e.date <= endEl.value && e.end_date >= startEl.value;
      return d >= start && d <= end;
    }
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() + 30);
    if (isMultiday) return e.date <= cutoff.toISOString().split('T')[0] && e.end_date >= todayStr;
    return d >= today && d <= cutoff;
  }).sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
}

// ---------- Favorites ----------

// Favorite IDs stay in localStorage even after an event has ended. In v1 the panel only
// shows upcoming saved events, so an ended favorite simply won't appear — but its ID is
// intentionally retained so a future "Past favorites" view can use it.
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('hiddenhelFavorites') || '[]'); }
  catch { return []; }
}
function isFavorite(id) { return getFavorites().includes(id); }
function addFavorite(id) {
  try {
    const favs = getFavorites();
    if (!favs.includes(id)) localStorage.setItem('hiddenhelFavorites', JSON.stringify([...favs, id]));
  } catch {}
}
function removeFavorite(id) {
  try {
    localStorage.setItem('hiddenhelFavorites', JSON.stringify(getFavorites().filter(f => f !== id)));
  } catch {}
}

function heartSVG() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}

function getUpcomingFavoriteEvents() {
  const favIds = getFavorites();
  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
  return events
    .filter(e => favIds.includes(e.id))
    .filter(e => (e.end_date ? e.end_date >= todayStr : eventEndsAt(e) >= now))
    .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
}

function updateFavBadge() {
  const badge = document.getElementById('favCountBadge');
  const count = getUpcomingFavoriteEvents().length;
  badge.textContent = count;
  badge.hidden = count === 0;
}

function toggleFavoriteById(id) {
  const adding = !isFavorite(id);
  if (adding) {
    addFavorite(id);
    const e = events.find(ev => ev.id === id);
    if (e) {
      // Register 'title' as a custom property in Plausible Site Settings if not already (may be set from Map Marker Click)
      plausible('Favorite Added', { props: { title: e.title } });
    }
  } else {
    removeFavorite(id);
  }
  document.querySelectorAll(`.heart-btn[data-id="${id}"]`).forEach(btn => {
    btn.classList.toggle('is-fav', adding);
    btn.setAttribute('aria-label', adding ? 'Remove from favorites' : 'Save to favorites');
  });
  updateFavBadge();
  if (document.getElementById('favPanel').classList.contains('open')) renderFavPanel();
}

function renderFavPanel() {
  const listEl = document.getElementById('favPanelList');
  const upcoming = getUpcomingFavoriteEvents();

  if (upcoming.length === 0) {
    listEl.innerHTML = '<div class="fav-empty">No favorites yet — tap the heart on any event to save it.</div>';
    return;
  }

  listEl.innerHTML = upcoming.map(e => {
    const freeTag = e.is_free === true  ? '<span class="event-tag event-tag-free">FREE</span>'
                  : e.is_free === false ? '<span class="event-tag event-tag-paid">PAID</span>'
                  : '';
    const signupTag = e.signup_required ? '<span class="event-tag event-tag-signup">SIGNUP</span>' : '';
    return `
      <div class="fav-row" data-id="${e.id}">
        <div class="fav-row-info">
          ${e.category ? `<div class="event-card-category">${escHtml(e.category)}</div>` : ''}
          <div class="card-date">${e.dateLabel}${e.end_date ? ' – ' + formatEndDate(e.end_date) : ''} ${!e.end_date && e.time ? `<span class="card-time">${escHtml(e.time)}${e.end_time ? '–' + escHtml(e.end_time) : ''}</span>` : ''}</div>
          <div class="card-title">${escHtml(e.title)}</div>
          <div class="card-location">${escHtml(e.location)}${freeTag}${signupTag}</div>
        </div>
        <button class="heart-btn is-fav fav-row-heart" data-id="${e.id}" aria-label="Remove from favorites">${heartSVG()}</button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.fav-row').forEach(row => {
    const id = parseInt(row.dataset.id);
    row.querySelector('.heart-btn').addEventListener('click', ev => {
      ev.stopPropagation();
      toggleFavoriteById(id);
    });
    row.addEventListener('click', () => {
      closeFavPanel();
      selectEvent(id);
    });
  });
}

function openFavPanel() {
  const panel = document.getElementById('favPanel');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  document.getElementById('favFloatBtn').classList.add('active');
  document.getElementById('favFloatBtn').setAttribute('aria-label', 'Close favorites');
  renderFavPanel();
}

function closeFavPanel() {
  const panel = document.getElementById('favPanel');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  document.getElementById('favFloatBtn').classList.remove('active');
  document.getElementById('favFloatBtn').setAttribute('aria-label', 'Open favorites');
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
    if (e.lat == null || e.lng == null) return;
    const marker = L.marker([e.lat, e.lng], {
      icon: createMarkerIcon(activeId === e.id)
    });
    clusterGroup.addLayer(marker);

const freeTag = e.is_free === true  ? '<span class="event-tag event-tag-free">FREE</span>'
                : e.is_free === false ? '<span class="event-tag event-tag-paid">PAID</span>'
                : '';
    const signupTag = e.signup_required ? '<span class="event-tag event-tag-signup">SIGNUP</span>' : '';
    const safeLink = e.link && /^https?:\/\//i.test(e.link) ? e.link : null;

    // Arrow function so Leaflet evaluates content fresh on every open —
    // isFavorite() is called at open time, not at renderMarkers() time.
    marker.bindPopup(() => {
      const fav = isFavorite(e.id);
      return `
      <div class="popup-inner">
        <div class="popup-meta">
          <div>
            ${e.category ? `<span class="popup-category">${escHtml(e.category)}</span>` : ''}
            <div class="popup-date-badge">${new Date(e.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })} ${e.date.split('-').reverse().join('.')}${e.end_date ? ' – ' + formatEndDate(e.end_date) : ''}</div>
          </div>
          <div class="popup-meta-right">
            <button class="heart-btn popup-heart${fav ? ' is-fav' : ''}" data-id="${e.id}" onclick="event.stopPropagation(); toggleFavoriteById(${e.id});" aria-label="${fav ? 'Remove from favorites' : 'Save to favorites'}">${heartSVG()}</button>
            ${e.time ? `<div class="popup-time-box"><div class="popup-time">${escHtml(e.time)}${e.end_time ? '–' + escHtml(e.end_time) : ''}</div></div>` : ''}
          </div>
        </div>
        <div class="popup-title">${escHtml(e.title)}</div>
        <div class="popup-desc">${escHtml(e.desc)}</div>
        <a href="https://www.google.com/maps?q=${e.lat},${e.lng}" target="_blank" class="popup-location">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin-icon lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
          ${escHtml(e.location)}
        </a>
        <div class="popup-footer">
          ${safeLink ? `<a href="${escHtml(safeLink)}" target="_blank" class="popup-link-btn">Event link <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>` : ''}
          ${freeTag}${signupTag}
        </div>
      </div>
    `;
    }, { className: 'custom-popup', closeButton: false, maxWidth: Math.min(260, window.innerWidth - 80) });

    marker.on('popupopen', () => {
      const el = marker.getPopup().getElement();
      el.querySelector('.popup-location')?.addEventListener('click', () => {
        plausible('Google Maps Click', { props: { title: e.title } });
      });
      if (safeLink) {
        el.querySelector('.popup-link-btn')?.addEventListener('click', () => {
          plausible('External Link Click', { props: { title: e.title } });
        });
      }
    });

    marker.on('click', () => {
      plausible('Map Marker Click', {props: {title: e.title}});
      selectEvent(e.id);
    });
    markers[e.id] = marker;
  });
}

// ---------- List ----------

function renderList(filtered) {
  const panel = document.getElementById('list-panel');

  if (filtered.length === 0) {
    panel.innerHTML = '<div class="empty-state">No events during this time. Your chance to shine?💎</div>';
    return;
  }

  panel.innerHTML = filtered.map(e => {
    const freeTag = e.is_free === true  ? '<span class="event-tag event-tag-free">FREE</span>'
                  : e.is_free === false ? '<span class="event-tag event-tag-paid">PAID</span>'
                  : '';
    const signupTag = e.signup_required ? '<span class="event-tag event-tag-signup">SIGNUP</span>' : '';
    const fav = isFavorite(e.id);
    return `
    <div class="event-card ${activeId === e.id ? 'active' : ''}" data-id="${e.id}">
      <button class="heart-btn${fav ? ' is-fav' : ''}" data-id="${e.id}" aria-label="${fav ? 'Remove from favorites' : 'Save to favorites'}">${heartSVG()}</button>
      ${e.category ? `<div class="event-card-category">${escHtml(e.category)}</div>` : ''}
      <div class="card-date">${e.dateLabel}${e.end_date ? ' – ' + formatEndDate(e.end_date) : ''} ${!e.end_date && e.time ? `<span class="card-time">${escHtml(e.time)}${e.end_time ? '–' + escHtml(e.end_time) : ''}</span>` : ''}</div>
      <div class="card-title">${escHtml(e.title)}</div>
      <div class="card-desc">${escHtml(e.desc)}</div>
      <div class="card-location">${escHtml(e.location)}${freeTag}${signupTag}</div>
    </div>
  `;
  }).join('');

  panel.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('click', () => {
      const e = filtered.find(ev => ev.id === parseInt(card.dataset.id));
      plausible('Event Card Click', {props: {title: e.title}});
      selectEvent(parseInt(card.dataset.id));
    });
  });

  panel.querySelectorAll('.heart-btn').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      toggleFavoriteById(parseInt(btn.dataset.id));
    });
  });
}

// ---------- State ----------

let activeFilter = 'all';
let activeCategory = 'all';
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

document.querySelectorAll('.filter-btn:not(#customDatesBtn)').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    activeId = null;
    plausible('Filter Click', {props: {filter: btn.dataset.filter}});
    render();
  });
});

// ---------- Category filter buttons ----------

document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.category;
    activeId = null;
    plausible('Category Filter Click', {props: {category: btn.dataset.category}});
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
    plausible('View Toggle', {props: {view: btn.dataset.view}});
  });
});

// ---------- Init ----------

fetchEvents().then(data => {
  events = data;
  const count = getFilteredEvents('all').length;
  document.querySelector('[data-filter="all"]').textContent = `All (${count})`;
  render();
  updateFavBadge();
});

// ---------- Welcome Overlay ----------

const overlay = document.getElementById('welcome-overlay');
if (localStorage.getItem('hiddenhelIntroSeen')) {
  overlay.style.display = 'none';
}

function closeOverlay() {
  localStorage.setItem('hiddenhelIntroSeen', 'true');
  overlay.style.display = 'none';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('favPanel').classList.contains('open')) { closeFavPanel(); return; }
    if (overlay.style.display !== 'none') closeOverlay();
  }
});

let canCloseOnBackdrop = false;
setTimeout(() => { canCloseOnBackdrop = true; }, 1500);

overlay.addEventListener('click', e => {
  if (e.target === overlay && canCloseOnBackdrop) closeOverlay();
});

// ---------- Hamburger menu ----------

const hamburgerBtn = document.getElementById('hamburgerBtn');
const hamburgerMenu = document.getElementById('hamburgerMenu');

hamburgerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  hamburgerBtn.classList.toggle('open');
  hamburgerMenu.classList.toggle('open');
});

document.addEventListener('click', () => {
  hamburgerBtn.classList.remove('open');
  hamburgerMenu.classList.remove('open');
});

// ---------- Custom Date Range Filter ----------

const customDatesBtn = document.getElementById('customDatesBtn');
const customDatesModal = document.getElementById('customDatesModal');
const customDatesCloseBtn = document.getElementById('customDatesCloseBtn');
const customDatesClearBtn = document.getElementById('customDatesClearBtn');
const customDatesSearchBtn = document.getElementById('customDatesSearchBtn');
const customStartDate = document.getElementById('customStartDate');
const customEndDate = document.getElementById('customEndDate');

// Pre-fill today and +7 days as a convenience
const _today = new Date();
const _plus7 = new Date(_today.getTime() + 7 * 86400000);
customStartDate.value = _today.toISOString().split('T')[0];
customEndDate.value = _plus7.toISOString().split('T')[0];

customStartDate.addEventListener('change', () => {
  if (!customEndDate.value || customEndDate.value < customStartDate.value) {
    customEndDate.value = customStartDate.value;
  }
});

function formatShortDate(str) {
  const [, m, d] = str.split('-');
  return `${parseInt(d)}.${parseInt(m)}`;
}

function clearCustomFilter() {
  customDatesModal.style.display = 'none';
  customDatesBtn.textContent = 'Custom dates';
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-filter="all"]').classList.add('active');
  activeFilter = 'all';
  activeId = null;
  render();
}

customDatesBtn.addEventListener('click', () => {
  if (activeFilter === 'custom') {
    clearCustomFilter();
    return;
  }
  plausible('Custom Date Range Click');
  customDatesModal.style.display = 'flex';
});

customDatesCloseBtn.addEventListener('click', () => {
  customDatesModal.style.display = 'none';
});

customDatesModal.addEventListener('click', (e) => {
  if (e.target === customDatesModal) customDatesModal.style.display = 'none';
});

customDatesClearBtn.addEventListener('click', clearCustomFilter);

customDatesSearchBtn.addEventListener('click', () => {
  const start = customStartDate.value;
  const end = customEndDate.value;

  if (!start || !end) {
    alert('Please select both start and end dates');
    return;
  }
  if (start > end) {
    alert('Start date must be before end date');
    return;
  }

  plausible('Custom Date Search', {props: {startDate: start, endDate: end}});
  customDatesModal.style.display = 'none';
  customDatesBtn.textContent = `${formatShortDate(start)}–${formatShortDate(end)} ✕`;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  customDatesBtn.classList.add('active');
  activeFilter = 'custom';
  activeId = null;
  render();
});

// ---------- Favorites panel listeners ----------

document.getElementById('favFloatBtn').addEventListener('click', () => {
  if (document.getElementById('favPanel').classList.contains('open')) {
    closeFavPanel();
  } else {
    openFavPanel();
  }
});

document.getElementById('favPanelClose').addEventListener('click', closeFavPanel);