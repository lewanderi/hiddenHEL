// MVP demo dates
function getRelativeDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

function getNextSaturday() {
  const day = new Date().getDay();
  return getRelativeDate(day === 6 ? 0 : 6 - day);
}

function getNextSunday() {
  const day = new Date().getDay();
  return getRelativeDate(day === 0 ? 0 : 7 - day);
}

const events = [
  {
    id: 1,
    title: "Tuesday Tunes",
    date: "2025-06-02",
    dateLabel: "Ti 2.6.",
    time: "18:00",
    desc: "Puistohengailu mellow dj seteillä. Bring your deck, leave your stress.",
    location: "Pengerpuisto, Kallio",
    lat: 60.1839,
    lng: 24.9511
  },
  {
    id: 2,
    title: "Kesän avaus pingis",
    date: "2025-06-05",
    dateLabel: "Pe 5.6.",
    time: "16:00",
    desc: "Kesän virallinen avaus, pingisturnauksen merkeissä.",
    location: "Hietsu uimaranta",
    lat: 60.173254,
    lng: 24.916592
  },
  {
    id: 3,
    title: "Leikkiklubi",
    date: "2025-06-16",
    dateLabel: "Ma 16.6.",
    time: "14:00",
    desc: "Leikkiklubi, pihapelejä kaikille!",
    location: "Mustikkamaa",
    lat: 60.181440,
    lng: 24.991664
  },
  {
    id: 4,
    title: "Hiekkalinnakilpailu",
    date: "2025-06-14",
    dateLabel: "La 14.6.",
    time: "12:00",
    desc: "Rakenna hienoin hiekkamuodostelma. Hiekka ja kunnia!",
    location: "Hietsu uimaranta",
    lat: 60.174109,
    lng: 24.906711
  },
  {
    id: 5,
    title: "Ice Bath Pop-up",
    date: "2025-06-22",
    dateLabel: "Su 22.6.",
    time: "13:00",
    desc: "DIY kylpyamme kesähelteellä. Kokeile kylmää kun muut hikoilee.",
    location: "Löylykontti, Sörnäinen",
    lat: 60.182381,
    lng: 24.963015
  },
  {
    id: 6,
    title: "Spikeball-Turnajaiset",
    date: "2025-07-04",
    dateLabel: "Pe 4.7.",
    time: "15:00",
    desc: "Rento spikeball turnaus. Ilmoittautuminen paikan päällä.",
    location: "Hietsu uimaranta",
    lat: 60.174109,
    lng: 24.906711
  },
  {
    id: 7,
    title: "Rantalenttis",
    date: getRelativeDate(0),
    dateLabel: "Tänään",
    time: "18:00",
    desc: "Rento lenttis turnaus. Ilmoittautuminen paikan päällä.",
    location: "Pony Beach, Pakila",
    lat: 60.246192,
    lng: 24.971611
  },
  {
    id: 8,
    title: "Puistokaraoke",
    date: getRelativeDate(2),
    dateLabel: "Tällä viikolla",
    time: "18:30",
    desc: "Karaoke night outside",
    location: "Pajalahden puisto, Lauttasaari",
    lat: 60.157623,
    lng: 24.884055
  },
  {
    id: 9,
    title: "LauantaiLeffa",
    date: getRelativeDate(2),
    dateLabel: "Tällä viikolla",
    time: "20:00",
    desc: "Outside movie @cafe X",
    location: "Tokoinranta",
    lat: 60.180088,
    lng: 24.941203
  },
  {
    id: 10,
    title: "Laru kybä",
    date: getNextSaturday(),
    dateLabel: "Tänä viikonloppuna",
    time: "9:00",
    desc: "Legendaarinen Larun 10km GOAT lenkki",
    location: "Kasinonranta, Lauttasaari",
    lat: 60.155156,
    lng: 24.871360
  },
  {
    id: 11,
    title: "Kahvia & Koiria",
    date: getNextSunday(),
    dateLabel: "Tänä viikonloppuna",
    time: "12:00",
    desc: "Kahvia ja karvakamuja",
    location: "Käpylän kiska",
    lat: 60.217113,
    lng: 24.954762
  },
  {
    id: 12,
    title: "Puistojooga",
    date: getRelativeDate(0),
    dateLabel: "Tänään",
    time: "17:00",
    desc: "Rento yin-jooga kaikentasoisille",
    location: "Munkkiniemen ranta",
    lat: 60.196334,
    lng: 24.868661
  },  
];

// ---------- Filtering ----------

function getFilteredEvents(filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();

  const daysUntilSat = (6 - dayOfWeek + 7) % 7;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + daysUntilSat);

  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - dayOfWeek));

  return events.filter(e => {
    const d = new Date(e.date);
    if (filter === 'today')   return d >= today && d < new Date(today.getTime() + 86400000);
    if (filter === 'weekend') return d >= saturday && d <= new Date(sunday.getTime() + 86400000);
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

    marker.bindPopup(`
      <div class="popup-inner">
        <div class="popup-date">${e.dateLabel} <span class="popup-time">${e.time}</span></div>
        <div class="popup-title">${e.title}</div>
        <div class="popup-desc">${e.desc}</div>
        <div class="popup-loc">${e.location}</div>
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

  panel.innerHTML = filtered.map(e => `
    <div class="event-card ${activeId === e.id ? 'active' : ''}" data-id="${e.id}">
      <div class="card-date">${e.dateLabel}</div>
      <div class="card-title">${e.title}</div>
      <div class="card-desc">${e.desc}</div>
      <div class="card-location">${e.location}</div>
    </div>
  `).join('');

  panel.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('click', () => selectEvent(parseInt(card.dataset.id)));
  });
}

// ---------- State ----------

let activeFilter = 'all';
let activeId = null;

function selectEvent(id) {
  activeId = id;
  const filtered = getFilteredEvents(activeFilter);
  renderList(filtered);

  Object.entries(markers).forEach(([mid, m]) => {
    m.setIcon(createMarkerIcon(parseInt(mid) === id));
  });

  if (markers[id]) {
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

render();