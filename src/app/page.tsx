'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { applyMonochromeStyle } from '@/lib/mapStyle'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

type Guest = {
  recordId: string;
  firstName: string;
  lastName: string;
  email: string;
  plusOne: string;
  plusOneName: string;
  dietaryRestrictions: string;
  dietDetail: string;
  welcomeDinner: boolean;
  afterParty: boolean;
  pizzaParty: boolean;
};

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.12)',
} as const;

const selectStyle = {
  background: '#191b25',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.12)',
} as const;

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  attending: 'Enthusiastically Yes',
  plusOne: 'No',
  plusOneName: '',
  dietaryRestrictions: 'No',
  dietDetail: '',
};

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

type AccordionEvent = {
  id: string;
  day: string;
  name: string;
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  time: string;
  dresscode: string;
  notes: string;
  icsStart: string;
  icsEnd: string;
  eventYear: number;
  eventMonth: number;
  eventDay: number;
};

const EVENTS: AccordionEvent[] = [
  {
    id: 'welcome-dinner',
    day: 'FRIDAY, AUGUST 14',
    name: 'Welcome Dinner',
    venueName: 'Barcelona Wine Bar',
    address: '310 NW 25th St, Miami, FL 33127',
    lat: 25.800746520300617,
    lng: -80.20101093115262,
    time: '6:00 PM – 9:00 PM',
    dresscode: 'Casual, cocktail attire',
    notes: 'The perfect kickoff. Amazing Food, drinks and party!  Uber / Lyft recommended',
    icsStart: '20260814T190000',
    icsEnd: '20260814T230000',
    eventYear: 2026,
    eventMonth: 8,
    eventDay: 14,
  },
  {
    id: 'wedding',
    day: 'SATURDAY, AUGUST 15',
    name: 'Wedding and Party',
    venueName: 'Yaya',
    address: '7999 NE Bayshore Ct, Miami, FL 33138',
    lat: 25.848697500937515,
    lng: -80.17283599937437,
    time: '6:00 PM – 12:00 AM',
    dresscode: 'Cocktail attire; jackets optional.',
    notes: 'Celebration required.',
    icsStart: '20260815T180000',
    icsEnd: '20260816T000000',
    eventYear: 2026,
    eventMonth: 8,
    eventDay: 15,
  },
  {
    id: 'after-party',
    day: 'SATURDAY, AUGUST 15',
    name: 'After Party',
    venueName: 'Private Venue',
    address: '1585 Bay Drive, Miami Beach, FL 33141',
    lat: 25.85103426335444,
    lng: -80.13504738775097,
    time: '12:30 PM – 2:00 AM',
    dresscode: 'Whatever you are wearing at that point.',
    notes: 'Continue the celebration into the night.',
    icsStart: '20260815T220000',
    icsEnd: '20260816T020000',
    eventYear: 2026,
    eventMonth: 8,
    eventDay: 15,
  },
  {
    id: 'pizza-party',
    day: 'SUNDAY, AUGUST 16',
    name: 'Post-Wedding Lunch',
    venueName: 'Bar Bucce',
    address: '7220 N Miami Ave, Miami, FL 33150',
    lat: 25.841693321200168,
    lng: -80.19682925035377,
    time: '1:00 PM – 3:00 PM',
    dresscode: 'Casual',
    notes: 'Come as you are.  Daytime, covered outdoor patio.',
    icsStart: '20260816T110000',
    icsEnd: '20260816T150000',
    eventYear: 2026,
    eventMonth: 8,
    eventDay: 16,
  },
];


// ── Where to Stay inline section ─────────────────────────────────────────────

declare global {
  interface Window {
    __propertyPhotos: Record<string, { photos: string[]; index: number }>;
    __clickPhoto: (id: string) => void;
    __prevPhoto: (id: string) => void;
    __nextPhoto: (id: string) => void;
  }
}

type LightboxState = { photos: string[]; index: number } | null;
type RouteStep = 'idle' | 'select-a' | 'select-b' | 'drawn';

type WtsProperty = {
  id: string; name: string; address: string;
  lat: number | null; lng: number | null;
  type: string; phone: string; website: string;
  contact: string; notes: string; photos: string[];
};

type WtsMarkerRef = {
  type: string; el: HTMLElement; id: string;
  lat: number; lng: number; name: string;
  marker: mapboxgl.Marker; popup: mapboxgl.Popup;
};

const WTS_ALL_TYPES = ['Hotel', 'Airbnb', 'Restaurant', 'Experience', 'Airport', 'Event Venue'];

const WTS_TYPE_COLOR: Record<string, string> = {
  'Hotel': '#19A767',
  'Airbnb': '#EF0C81',
  'Restaurant': '#299FDE',
  'Experience': '#B50101',
  'Airport': '#FFA826',
  'Event Venue': '#B59D01',
};

const WTS_PILL_STYLE = "background:#191b25;color:#fff;padding:6px 14px;border-radius:20px;font-family:'OpenSauceOne',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.5px;white-space:nowrap;";

const WTS_BTN: React.CSSProperties = {
  background: '#191b25', borderRadius: '6px', padding: '6px 12px',
  fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
  border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff',
  cursor: 'pointer', textTransform: 'uppercase',
  fontFamily: "'OpenSauceOne', Arial, sans-serif",
};

function wtsTypeColor(t: string) { return WTS_TYPE_COLOR[t] ?? '#666666'; }

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8, r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}


const WTS_MARKER_FILTER = 'drop-shadow(0 0 1.5px white) drop-shadow(0 0 1.5px white) drop-shadow(1px 2px 3px rgba(0,0,0,0.5))';

function createWTSMarkerElement(name: string, type: string): HTMLElement | null {
  if (!WTS_ALL_TYPES.includes(type)) return null;
  const iconSrc = type === 'Event Venue' ? '/icons/marker-event-venue.svg' : '/icons/marker.svg';

  const label = type === 'Airbnb' ? 'Airbnb' : name;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:opacity 250ms ease;';

  const labelEl = document.createElement('div');
  labelEl.textContent = label;
  labelEl.style.cssText = "background:rgba(0,0,0,0.6);color:white;font-family:'SpaceMono',monospace;font-size:10px;padding:2px 6px;border-radius:4px;white-space:nowrap;margin-bottom:2px;line-height:1.5;";

  const imgEl = document.createElement('img');
  imgEl.src = iconSrc;
  imgEl.width = 20;
  imgEl.height = 20;
  imgEl.style.cssText = `display:block;object-fit:contain;filter:${WTS_MARKER_FILTER};`;

  wrapper.appendChild(labelEl);
  wrapper.appendChild(imgEl);
  return wrapper;
}

function buildWTSPopupHTML(p: WtsProperty): string {
  const color = wtsTypeColor(p.type);
  const badge = `<span style="display:inline-block;padding:2px 10px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;background:${color}">${p.type}</span>`;
  const phone = p.phone ? `<p style="margin:6px 0 0;font-size:13px;color:#000">${p.phone}</p>` : '';
  const website = p.website ? `<a href="${p.website}" target="_blank" rel="noopener noreferrer" style="display:block;margin:6px 0 0;font-size:13px;font-weight:700;color:${color};text-decoration:underline;">${p.type} Link</a>` : '';
  const contact = p.contact ? `<p style="margin:6px 0 0;font-size:13px;color:#000">Contact: ${p.contact}</p>` : '';
  const notes = p.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#000;opacity:0.8;font-weight:400;line-height:1.5">${p.notes}</p>` : '';
  const bs = `position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:3px;width:28px;height:28px;font-size:18px;cursor:pointer;z-index:2;padding:0;line-height:1;display:flex;align-items:center;justify-content:center;`;
  let photoSection = '';
  if (p.photos.length > 0) {
    const arrows = p.photos.length > 1
      ? `<button onclick="event.stopPropagation();window.__prevPhoto('${p.id}')" style="${bs}left:6px;">‹</button>
         <button onclick="event.stopPropagation();window.__nextPhoto('${p.id}')" style="${bs}right:6px;">›</button>
         <span id="popup-counter-${p.id}" style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.5);color:#fff;font-size:11px;padding:2px 8px;border-radius:3px;z-index:2;white-space:nowrap;">1 / ${p.photos.length}</span>`
      : '';
    photoSection = `<div style="position:relative;overflow:hidden;border-radius:4px 4px 0 0;">
      <img id="popup-img-${p.id}" src="${p.photos[0]}" onclick="window.__clickPhoto('${p.id}')" style="width:100%;height:140px;object-fit:cover;display:block;cursor:pointer;" />${arrows}</div>`;
  }
  return `<div style="font-family:'OpenSauceOne',Arial,sans-serif;min-width:220px;max-width:260px;overflow:hidden;border-radius:4px">
    ${photoSection}
    <div style="padding:12px 14px 14px">${badge}
      <h3 style="margin:8px 0 4px;font-size:15px;font-weight:700;color:#000;line-height:1.3">${p.name}</h3>
      <p style="margin:0;font-size:12px;color:#000;line-height:1.4">${p.address}</p>
      ${phone}${website}${contact}${notes}
    </div></div>`;
}

// ─────────────────────────────────────────────────────────────────────────────

function roundedRectGeoJSON(
  minLng: number, minLat: number,
  maxLng: number, maxLat: number,
  radius: number
): [number, number][] {
  const pts: [number, number][] = [];
  const steps = 8;
  const arc = (cx: number, cy: number, startAngle: number) => {
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (Math.PI / 2) * (i / steps);
      pts.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
    }
  };
  arc(minLng + radius, minLat + radius, Math.PI);        // bottom-left
  arc(maxLng - radius, minLat + radius, Math.PI * 1.5);  // bottom-right
  arc(maxLng - radius, maxLat - radius, 0);              // top-right
  arc(minLng + radius, maxLat - radius, Math.PI / 2);    // top-left
  pts.push(pts[0]); // close ring
  return pts;
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [lng] = useState(-80.1727827538205);
  const [lat] = useState(25.850014692533772);

  const buttonRowRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<'plan' | 'stay' | 'area' | null>(null);

  const [guest, setGuest] = useState<Guest | null>(null);
  const [isRSVPOpen, setIsRSVPOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState(emptyForm);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // WTS state
  const [wtsRouteMode, setWtsRouteMode] = useState(false);
  const [wtsRouteStep, setWtsRouteStep] = useState<RouteStep>('idle');
  const [wtsFilterOpen, setWtsFilterOpen] = useState(false);
  const [wtsSelectedTypes, setWtsSelectedTypes] = useState<Set<string>>(() => new Set());
  const [wtsLightbox, setWtsLightbox] = useState<LightboxState>(null);
  const [wtsMapExpanded, setWtsMapExpanded] = useState(false);

  // WTS refs
  const wtsMapContainer = useRef<HTMLDivElement>(null);
  const wtsMap = useRef<mapboxgl.Map | null>(null);
  const wtsMarkerRefs = useRef<WtsMarkerRef[]>([]);
  const wtsInitialized = useRef(false);
  const wtsRouteModeRef = useRef(false);
  const wtsRoutePointARef = useRef<WtsMarkerRef | null>(null);
  const wtsRoutePointBRef = useRef<WtsMarkerRef | null>(null);
  const wtsRemoveRouteRef = useRef<() => void>(() => {});
  const wtsOpenPopupRef = useRef<mapboxgl.Popup | null>(null);
  const wtsDropdownRef = useRef<HTMLDivElement>(null);

  const copyVenue = (venue: string, id: string) => {
    navigator.clipboard.writeText(venue).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };


  // Resolve guest from ?g= param or existing cookie
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gParam = params.get('g');

    if (gParam) {
      fetch(`/api/guest?id=${encodeURIComponent(gParam)}`)
        .then(r => r.ok ? r.json() : null)
        .then((data: Guest | null) => {
          if (data) {
            setGuest(data);
            writeCookie('cw_guest', JSON.stringify(data), 30);
          }
        })
        .catch(() => null);
    } else {
      const raw = readCookie('cw_guest');
      if (raw) {
        try { setGuest(JSON.parse(raw)); } catch { /* malformed cookie */ }
      }
    }
  }, []);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-80.1600, 25.8300],
      zoom: 11.5,
    });
    map.current.on('load', () => {
      applyMonochromeStyle(map.current!);

      // ── Area-of-interest regions (rounded GeoJSON polygons) ─────────────────
      const areaRegions: [number, number, number, number, number][] = [
        [-80.1415, 25.7765, -80.1080, 25.8760, 0.003], // Miami Beach + Surfside
        [-80.1850, 25.8430, -80.1460, 25.8540, 0.003], // Normandy + North Bay Village
        [-80.2000, 25.7950, -80.1880, 25.8080, 0.003], // Wynwood
        [-80.1980, 25.8050, -80.1830, 25.8220, 0.003], // Midtown + Design District
      ];

      areaRegions.forEach(([minLng, minLat, maxLng, maxLat, r], i) => {
        const id = `area-region-${i + 1}`;
        const ring = roundedRectGeoJSON(minLng, minLat, maxLng, maxLat, r);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.current!.addSource(id, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } } } as any);
        map.current!.addLayer({ id: `${id}-fill`, type: 'fill', source: id, paint: { 'fill-color': 'rgba(147, 197, 253, 0.25)' } });
        map.current!.addLayer({ id: `${id}-line`, type: 'line', source: id, paint: { 'line-color': '#2563eb', 'line-width': 2, 'line-dasharray': [3, 2] } });
      });
    });
    new mapboxgl.Marker({ color: '#191b25' })
      .setLngLat([lng, lat])
      .addTo(map.current);
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [lng, lat]);

  const closeRSVP = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsRSVPOpen(false);
      setIsClosing(false);
      setStatus('idle');
      setFormData(emptyForm);
    }, 150);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRSVP(); };
    if (isRSVPOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isRSVPOpen, closeRSVP]);

  const openRSVP = () => {
    setFormData(guest ? {
      ...emptyForm,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      plusOne: guest.plusOne || 'No',
      plusOneName: guest.plusOneName || '',
      dietaryRestrictions: guest.dietaryRestrictions || 'No',
      dietDetail: guest.dietDetail || '',
    } : emptyForm);
    setIsClosing(false);
    setIsRSVPOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, recordId: guest?.recordId }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // WTS photo bridge
  useEffect(() => {
    window.__propertyPhotos = {};
    window.__clickPhoto = (id) => {
      const d = window.__propertyPhotos[id];
      if (d) setWtsLightbox({ photos: d.photos, index: d.index });
    };
    window.__prevPhoto = (id) => {
      const d = window.__propertyPhotos[id];
      if (!d) return;
      d.index = (d.index - 1 + d.photos.length) % d.photos.length;
      const img = document.getElementById(`popup-img-${id}`) as HTMLImageElement | null;
      if (img) img.src = d.photos[d.index];
      const counter = document.getElementById(`popup-counter-${id}`);
      if (counter) counter.textContent = `${d.index + 1} / ${d.photos.length}`;
    };
    window.__nextPhoto = (id) => {
      const d = window.__propertyPhotos[id];
      if (!d) return;
      d.index = (d.index + 1) % d.photos.length;
      const img = document.getElementById(`popup-img-${id}`) as HTMLImageElement | null;
      if (img) img.src = d.photos[d.index];
      const counter = document.getElementById(`popup-counter-${id}`);
      if (counter) counter.textContent = `${d.index + 1} / ${d.photos.length}`;
    };
  }, []);

  // WTS map: lazy init on first open
  useEffect(() => {
    if (activeSection !== 'stay' || wtsInitialized.current || !wtsMapContainer.current) return;
    const timer = setTimeout(async () => {
      if (wtsMap.current || !wtsMapContainer.current) return;
      wtsInitialized.current = true;

      wtsMap.current = new mapboxgl.Map({
        container: wtsMapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-80.1918, 25.7617],
        zoom: 11,
      });

      wtsMap.current.on('load', () => {
        applyMonochromeStyle(wtsMap.current!);

        let wtsRouteInfoPopup: mapboxgl.Popup | null = null;

        const wtsRemoveRoute = () => {
          wtsRouteInfoPopup?.remove();
          wtsRouteInfoPopup = null;
          if (wtsMap.current?.getLayer('wts-route')) wtsMap.current.removeLayer('wts-route');
          if (wtsMap.current?.getSource('wts-route')) wtsMap.current.removeSource('wts-route');
        };
        wtsRemoveRouteRef.current = wtsRemoveRoute;

        const wtsAddRoute = (geometry: object, mid: [number, number], label: string) => {
          wtsRemoveRoute();
          if (!wtsMap.current) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wtsMap.current.addSource('wts-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry } } as any);
          wtsMap.current.addLayer({ id: 'wts-route', type: 'line', source: 'wts-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#191b25', 'line-width': 3, 'line-dasharray': [2, 2] } });
          wtsRouteInfoPopup = new mapboxgl.Popup({ closeButton: false, anchor: 'bottom', offset: [0, -6], className: 'compare-pill' })
            .setLngLat(mid).setHTML(`<div style="${WTS_PILL_STYLE}">${label}</div>`).addTo(wtsMap.current);
        };

        const wtsFetchRoute = async (a: WtsMarkerRef, b: WtsMarkerRef) => {
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${a.lng},${a.lat};${b.lng},${b.lat}?geometries=geojson&access_token=${token}`;
          const mid: [number, number] = [(a.lng + b.lng) / 2, (a.lat + b.lat) / 2];
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const data = await res.json();
            const route = data.routes?.[0];
            if (!route) throw new Error();
            const coords: [number, number][] = route.geometry.coordinates;
            const routeMid = coords[Math.floor(coords.length / 2)] ?? mid;
            wtsAddRoute(route.geometry, routeMid, `${Math.round(route.duration / 60)} min · ${(route.distance / 1609.34).toFixed(1)} mi`);
          } catch {
            const dist = haversineMiles(a.lat, a.lng, b.lat, b.lng);
            wtsAddRoute({ type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] }, mid, `${dist.toFixed(1)} mi (straight line)`);
          }
        };

        fetch('/api/properties')
          .then(r => r.json())
          .then((properties: WtsProperty[]) => {
            const bounds = new mapboxgl.LngLatBounds();
            let hasMarkers = false;
            properties.forEach(p => {
              if (p.lat == null || p.lng == null) return;
              hasMarkers = true;
              bounds.extend([p.lng, p.lat]);
              if (p.photos.length > 0) window.__propertyPhotos[p.id] = { photos: p.photos, index: 0 };

              const popup = new mapboxgl.Popup({ maxWidth: '280px', offset: 14, closeOnClick: false })
                .setHTML(buildWTSPopupHTML(p));
              popup.on('open', () => {
                if (wtsOpenPopupRef.current && wtsOpenPopupRef.current !== popup) wtsOpenPopupRef.current.remove();
                wtsOpenPopupRef.current = popup;
              });
              popup.on('close', () => { if (wtsOpenPopupRef.current === popup) wtsOpenPopupRef.current = null; });

              const customEl = createWTSMarkerElement(p.name, p.type);
              let markerInstance: mapboxgl.Marker;
              let markerEl: HTMLElement;

              if (customEl) {
                markerInstance = new mapboxgl.Marker({ element: customEl, anchor: 'bottom' })
                  .setLngLat([p.lng, p.lat]).setPopup(popup).addTo(wtsMap.current!);
                markerEl = customEl;
              } else {
                markerInstance = new mapboxgl.Marker({ color: wtsTypeColor(p.type) })
                  .setLngLat([p.lng, p.lat]).setPopup(popup).addTo(wtsMap.current!);
                markerEl = markerInstance.getElement();
                markerEl.style.transition = 'opacity 250ms ease';
              }

              const markerRef: WtsMarkerRef = { type: p.type, el: markerEl, id: p.id, lat: p.lat, lng: p.lng, name: p.name, marker: markerInstance, popup };
              wtsMarkerRefs.current.push(markerRef);

              markerEl.addEventListener('click', () => {
                if (!wtsRouteModeRef.current) return;
                if (!wtsRoutePointARef.current) {
                  wtsRoutePointARef.current = markerRef;
                  markerEl.style.boxShadow = '0 0 0 2px #000000';
                  setWtsRouteStep('select-b');
                } else if (!wtsRoutePointBRef.current && wtsRoutePointARef.current.id !== p.id) {
                  wtsRoutePointBRef.current = markerRef;
                  markerEl.style.boxShadow = '0 0 0 2px #000000';
                  setWtsRouteStep('drawn');
                  const fb = new mapboxgl.LngLatBounds();
                  fb.extend([wtsRoutePointARef.current.lng, wtsRoutePointARef.current.lat]);
                  fb.extend([p.lng!, p.lat!]);
                  wtsMap.current!.fitBounds(fb, { padding: 100, duration: 800 });
                  wtsFetchRoute(wtsRoutePointARef.current, markerRef);
                }
              });
            });
            if (hasMarkers) wtsMap.current!.fitBounds(bounds, { padding: 80, maxZoom: 14 });
          })
          .catch(console.error);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [activeSection]);

  // WTS map cleanup on unmount
  useEffect(() => {
    return () => {
      wtsMarkerRefs.current = [];
      if (wtsMap.current) { wtsMap.current.remove(); wtsMap.current = null; }
    };
  }, []);

  // WTS filter visibility
  useEffect(() => {
    wtsMarkerRefs.current.forEach(({ type, el }) => {
      const visible = wtsSelectedTypes.size === 0 || wtsSelectedTypes.has(type);
      el.style.opacity = visible ? '1' : '0';
      el.style.pointerEvents = visible ? 'auto' : 'none';
    });
  }, [wtsSelectedTypes]);

  // WTS dropdown outside-click
  useEffect(() => {
    if (!wtsFilterOpen) return;
    const handler = (e: MouseEvent) => {
      if (wtsDropdownRef.current && !wtsDropdownRef.current.contains(e.target as Node)) setWtsFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [wtsFilterOpen]);

  const openWTS = () => {
    const isOpen = activeSection === 'stay';
    if (isOpen) {
      setWtsMapExpanded(false);
      setActiveSection(null);
    } else {
      setActiveSection('stay');
      if (wtsInitialized.current) setTimeout(() => wtsMap.current?.resize(), 260);
    }
  };

  const enterWTSRouteMode = () => {
    wtsRouteModeRef.current = true;
    wtsRoutePointARef.current = null;
    wtsRoutePointBRef.current = null;
    setWtsRouteMode(true);
    setWtsRouteStep('select-a');
    wtsMarkerRefs.current.forEach(r => r.marker.setPopup(null));
  };

  const exitWTSRouteMode = () => {
    wtsRouteModeRef.current = false;
    if (wtsRoutePointARef.current) wtsRoutePointARef.current.el.style.boxShadow = '';
    if (wtsRoutePointBRef.current) wtsRoutePointBRef.current.el.style.boxShadow = '';
    wtsRoutePointARef.current = null;
    wtsRoutePointBRef.current = null;
    wtsMarkerRefs.current.forEach(r => r.marker.setPopup(r.popup));
    setWtsRouteMode(false);
    setWtsRouteStep('idle');
    wtsRemoveRouteRef.current();
  };

  const toggleWTSType = (type: string) => {
    setWtsSelectedTypes(prev => {
      const effective = prev.size === 0 ? new Set(WTS_ALL_TYPES) : new Set(prev);
      if (effective.has(type)) effective.delete(type); else effective.add(type);
      return effective.size === WTS_ALL_TYPES.length ? new Set<string>() : effective;
    });
  };

  const removeWTSFilterType = (type: string) => {
    setWtsSelectedTypes(prev => { const n = new Set(prev); n.delete(type); return n; });
  };

  const setWTSLightboxIndex = (i: number) => setWtsLightbox(p => p ? { ...p, index: i } : null);

  // Resize map after expand/collapse transition completes
  useEffect(() => {
    const t = setTimeout(() => wtsMap.current?.resize(), 310);
    return () => clearTimeout(t);
  }, [wtsMapExpanded]);


  // Scroll button row into view on every section toggle
  useEffect(() => {
    setTimeout(() => {
      buttonRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [activeSection]);

  const openMap = () => {
    setActiveSection(prev => {
      const next = prev === 'plan' ? null : 'plan';
      if (next === 'plan') setTimeout(() => map.current?.resize(), 260);
      return next;
    });
  };

  const ctaButtons: { label: string; onClick?: () => void; href?: string; hidden?: boolean }[] = [
    { label: 'RSVP', onClick: openRSVP },
    { label: 'WHERE TO STAY', onClick: openWTS },
    { label: 'WHAT TO PLAN FOR', onClick: openMap },
  ];

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const visibleEvents = EVENTS.filter(event => {
    if (event.id === 'wedding') return true;
    if (!guest) return false;
    if (event.id === 'welcome-dinner') return guest.welcomeDinner === true;
    if (event.id === 'after-party') return guest.afterParty === true;
    if (event.id === 'pizza-party') return guest.pizzaParty === true;
    return false;
  });

  return (
    <main style={{ background: '#191b25' }} className="min-h-screen text-white">

      {/* Hero */}
      <section
        style={{ background: 'linear-gradient(to top, #191b25 27%, #131417 91%)' }}
        className="flex flex-col items-center justify-center text-center px-6 py-24 min-h-[60vh]"
      >
        <div className="flex flex-col items-center gap-6">
          <p className="font-display text-white font-bold text-xl md:text-2xl tracking-wide" aria-live="polite">
            Welcome{guest?.firstName ? ` ${guest.firstName}` : ''}
          </p>
          <p className="font-ui text-white text-sm uppercase" style={{ letterSpacing: '1px' }}>
            {guest?.plusOneName
              ? `You and ${guest.plusOneName} are cordially invited to join us for`
              : 'You are cordially invited to join us for'}
          </p>
          <p className="font-display text-white font-bold text-xl md:text-2xl tracking-wide">
            the celebration of
          </p>
        </div>

        <img src="/CD_logo.svg" alt="Castlewave" className="w-[200px] md:w-[280px] my-16" />

        <p className="font-display text-white text-xl md:text-2xl tracking-wide">
          August 15, 2026
        </p>
        <p className="font-display text-white text-xl md:text-2xl tracking-wide">
          Miami, FL
        </p>
        <p className="font-ui text-white text-sm uppercase" style={{ letterSpacing: '1px' }}>
          <br />
          <br />
          Additional time and venue details to follow
          </p>
      </section>

      {/* CTA Buttons + inline map */}
      <section className="flex flex-col items-center px-6 pt-10 pb-20">
        {/* Outer wrapper: full-width on mobile, shrinks to button row width on desktop */}
        <div className="flex flex-col w-full md:w-fit md:mx-auto">
          <div ref={buttonRowRef} className="flex flex-col md:flex-row gap-4">
            {ctaButtons.map(({ label, onClick, href, hidden }) => {
              const sharedStyle = {
                background: '#191b25',
                borderRadius: '6px',
                height: '75px',
                minWidth: '279px',
                letterSpacing: '1px',
                border: '1px solid rgba(255,255,255,0.15)',
                ...(hidden ? { display: 'none' } : {}),
              };
              const sharedClass = "font-ui flex items-center justify-center w-full md:w-auto text-white font-bold uppercase text-sm px-8 transition-opacity duration-150 hover:opacity-70 cursor-pointer";
              return href ? (
                <Link key={label} href={href} style={sharedStyle} className={sharedClass}>
                  {label}
                </Link>
              ) : (
                <button key={label} onClick={onClick} style={sharedStyle} className={sharedClass}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Accordion — above text and map */}
          {activeSection === 'plan' && (
            <div className="animate-fade-in" style={{ marginTop: '8px', width: '100%' }}>
              {visibleEvents.map((event, idx) => (
                <div key={event.id} style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.1)' : undefined }}>
                  {/* Header */}
                  <button
                    onClick={() => setOpenAccordion(openAccordion === event.id ? null : event.id)}
                    className="w-full flex items-center justify-between"
                    style={{ padding: '16px 20px', textAlign: 'left' }}
                  >
                    <div>
                      <div className="font-mono uppercase" style={{ fontSize: '13px', letterSpacing: '2px', color: '#D4A853', marginBottom: '4px' }}>
                        {event.day}
                      </div>
                      <div className="font-ui text-white" style={{ fontSize: '16px', fontWeight: 500 }}>
                        {event.name}
                      </div>
                    </div>
                    <span className="font-mono" style={{ fontSize: '20px', color: '#D4A853', flexShrink: 0, marginLeft: '16px' }}>
                      {openAccordion === event.id ? '−' : '+'}
                    </span>
                  </button>

                  {/* Expanded content */}
                  <div style={{ maxHeight: openAccordion === event.id ? '600px' : '0', overflow: 'hidden', transition: 'max-height 250ms ease' }}>
                    {(() => {
                      const isDayOf = todayYear === event.eventYear && todayMonth === event.eventMonth && todayDay === event.eventDay;
                      const btnStyle: React.CSSProperties = { fontSize: '11px', letterSpacing: '1px', color: '#D4A853', border: '1px solid #D4A853', borderRadius: '6px', padding: '6px 12px', background: 'transparent', cursor: 'pointer' };
                      const calBtn = (
                        <a
                          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${event.icsStart}/${event.icsEnd}&location=${encodeURIComponent(event.address)}&details=${encodeURIComponent(event.notes)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="font-mono uppercase"
                          style={{ ...btnStyle, textDecoration: 'none', display: 'inline-block' }}
                        >
                          Add to Calendar
                        </a>
                      );
                      const venueCard = (
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', marginBottom: '4px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <img src="/icons/location.svg" alt="" width={20} height={20} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0, marginTop: '2px' }} />
                            <div>
                              <div className="font-mono uppercase" style={{ fontSize: '11px', letterSpacing: '2px', color: '#D4A853', marginBottom: '3px' }}>Venue</div>
                              <div className="font-ui text-white" style={{ fontSize: '15px' }}>{event.venueName}</div>
                            </div>
                          </div>
                        </div>
                      );
                      const locationCard = (
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', marginBottom: '4px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <img src="/icons/location.svg" alt="" width={20} height={20} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ flex: 1 }}>
                              <div className="font-mono uppercase" style={{ fontSize: '11px', letterSpacing: '2px', color: '#D4A853', marginBottom: '3px' }}>Location</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span className="font-ui text-white" style={{ fontSize: '15px' }}>{event.address}</span>
                                <span
                                  role="button"
                                  onClick={(e) => { e.stopPropagation(); copyVenue(event.address, event.id); }}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', flexShrink: 0 }}
                                  aria-label="Copy address"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white" style={{ opacity: 0.55, flexShrink: 0 }}>
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                  </svg>
                                  <span className="font-mono uppercase" style={{ fontSize: '10px', letterSpacing: '1px', color: '#D4A853' }}>
                                    {copiedId === event.id ? 'Copied!' : 'copy address'}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      if (isDayOf) {
                        return (
                          <div style={{ padding: '0 20px 20px' }}>
                            {venueCard}
                            {locationCard}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '24px' }}>
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono uppercase"
                                style={{ ...btnStyle, textDecoration: 'none', display: 'inline-block' }}
                              >
                                Get Directions
                              </a>
                              <a
                                href={`https://lyft.com/ride?destination[address]=${encodeURIComponent(event.address)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="font-mono uppercase"
                                style={{ ...btnStyle, textDecoration: 'none', display: 'inline-block' }}
                              >
                                Lyft
                              </a>
                              {calBtn}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div style={{ padding: '0 20px 20px' }}>
                          {venueCard}
                          {locationCard}

                          {/* Time */}
                          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', marginBottom: '4px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                              <img src="/icons/clock.svg" alt="" width={20} height={20} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <div className="font-mono uppercase" style={{ fontSize: '11px', letterSpacing: '2px', color: '#D4A853', marginBottom: '3px' }}>Time</div>
                                <div className="font-ui text-white" style={{ fontSize: '15px' }}>{event.time}</div>
                              </div>
                            </div>
                          </div>

                          {/* Dress */}
                          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', marginBottom: '4px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                              <img src="/icons/dress.svg" alt="" width={20} height={20} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <div className="font-mono uppercase" style={{ fontSize: '11px', letterSpacing: '2px', color: '#D4A853', marginBottom: '3px' }}>Dress</div>
                                <div className="font-ui text-white" style={{ fontSize: '15px' }}>{event.dresscode}</div>
                              </div>
                            </div>
                          </div>

                          {/* Detail */}
                          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', marginBottom: '4px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                              <img src="/icons/notes.svg" alt="" width={20} height={20} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <div className="font-mono uppercase" style={{ fontSize: '11px', letterSpacing: '2px', color: '#D4A853', marginBottom: '3px' }}>Detail</div>
                                <div className="font-ui text-white" style={{ fontSize: '15px' }}>{event.notes}</div>
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '24px' }}>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono uppercase"
                              style={{ ...btnStyle, textDecoration: 'none', display: 'inline-block' }}
                            >
                              Get Directions
                            </a>
                            <a
                              href={`https://lyft.com/ride?destination[address]=${encodeURIComponent(event.address)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="font-mono uppercase"
                              style={{ ...btnStyle, textDecoration: 'none', display: 'inline-block' }}
                            >
                              Lyft
                            </a>
                            {calBtn}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Map drawer — text then map */}
          <div className={`map-drawer${activeSection === 'plan' ? ' open' : ''}`}>
          <div style={{ maxWidth: '869px', margin: '0 auto', padding: '16px 20px 24px 20px', textAlign: 'left' }}>
            <p className="font-ui text-white text-sm" style={{ letterSpacing: '1px' }}>
              The areas highlighted on the map below are where we recommend you focus your search. All are easily accessible to the event venue.
            </p>
          </div>
          <div className="h-[300px] md:h-[400px]" style={{ borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
            <div ref={mapContainer} className="w-full h-full" />
            <button
              onClick={() => setActiveSection(null)}
              className="absolute top-2 right-2 z-10 font-ui text-white/70 hover:text-white text-sm leading-none transition-colors"
              style={{ background: 'rgba(0,0,0,0.45)', borderRadius: '4px', width: '28px', height: '28px' }}
              aria-label="Close map"
            >
              ✕
            </button>
          </div>
        </div>
        </div>
      </section>

      {/* WTS inline section */}
      <section style={{ paddingLeft: wtsMapExpanded ? '20px' : '24px', paddingRight: wtsMapExpanded ? '20px' : '24px', transition: 'padding-left 300ms ease, padding-right 300ms ease' }}>
        <div className={`wts-drawer${activeSection === 'stay' ? ' open' : ''}${wtsMapExpanded ? ' map-expanded' : ''}`}>
          {/* Description */}
          <div style={{ maxWidth: '869px', margin: '0 auto', padding: '8px 20px 20px 20px', textAlign: 'left' }}>
            <p className="font-ui text-white text-sm" style={{ letterSpacing: '1px' }}>
              Miami has something for everyone; and the event will be easily accessible from wherever you decide to stay. We have compiled options for hotels and Airbnbs to help cut down on the search. With that said — these are just suggestions for those less familiar with the Miami area. If you know where you want to stay, don&apos;t let our suggestions dissuade you! Our partners have graciously offered a discount for our guests, and those details are included in each listing below.
            </p>
          </div>

          {/* Filter + See Routes row */}
          <div style={{ maxWidth: '869px', margin: '0 auto', padding: '0 20px 8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div ref={wtsDropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setWtsFilterOpen(f => !f); }}
                className="font-ui font-bold flex items-center gap-2"
                style={WTS_BTN}
              >
                {wtsSelectedTypes.size === 0 ? <span>All Properties</span> : (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                    {[...wtsSelectedTypes].map(type => (
                      <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', padding: '1px 4px 1px 6px', fontSize: '10px' }}>
                        {type}
                        <span role="button" onClick={(e) => { e.stopPropagation(); removeWTSFilterType(type); }} style={{ cursor: 'pointer', fontSize: '13px' }}>×</span>
                      </span>
                    ))}
                  </span>
                )}
                <span style={{ fontSize: '8px', opacity: 0.5, marginLeft: '2px' }}>{wtsFilterOpen ? '▲' : '▼'}</span>
              </button>
              {wtsFilterOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: '#191b25', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '12px 14px', minWidth: '180px', zIndex: 30 }}>
                  <p className="font-ui font-bold uppercase" style={{ fontSize: '11px', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Show only:</p>
                  {WTS_ALL_TYPES.map(type => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={wtsSelectedTypes.size === 0 || wtsSelectedTypes.has(type)} onChange={() => toggleWTSType(type)} style={{ cursor: 'pointer', accentColor: '#ffffff' }} />
                      <span className="font-ui font-bold uppercase text-white" style={{ fontSize: '11px', letterSpacing: '1px' }}>{type}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={wtsRouteMode ? exitWTSRouteMode : enterWTSRouteMode}
              className="font-ui font-bold transition-opacity hover:opacity-70"
              style={WTS_BTN}
            >
              {wtsRouteMode ? 'CLEAR ROUTE' : 'SEE ROUTES'}
            </button>
          </div>

          {/* Map */}
          <div style={{ maxWidth: wtsMapExpanded ? 'calc(100vw - 40px)' : '869px', margin: '0 auto', padding: wtsMapExpanded ? '0 0 16px 0' : '0 20px 16px 20px', transition: 'max-width 300ms ease, padding 300ms ease' }}>
            <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', height: wtsMapExpanded ? '70vh' : '360px', transition: 'height 300ms ease' }}>
              <div ref={wtsMapContainer} className="w-full h-full" />
              {wtsRouteMode && wtsRouteStep !== 'drawn' && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 z-10 animate-fade-in"
                  style={{ top: '12px', background: '#191b25', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '8px 16px', fontFamily: "'OpenSauceOne', Arial, sans-serif", fontSize: '13px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}
                >
                  {wtsRouteStep === 'select-a' ? 'Select your first location' : 'Now select your second location'}
                </div>
              )}
              <button
                onClick={() => setWtsMapExpanded(e => !e)}
                title={wtsMapExpanded ? 'Collapse map' : 'Expand map'}
                className="absolute top-2 right-2 z-10"
                style={{ background: 'rgba(25,27,37,0.85)', borderRadius: '6px', padding: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label={wtsMapExpanded ? 'Collapse map' : 'Expand map'}
              >
                {wtsMapExpanded ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20"/>
                    <polyline points="20 10 14 10 14 4"/>
                    <line x1="10" y1="14" x2="3" y2="21"/>
                    <line x1="21" y1="3" x2="14" y2="10"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/>
                    <polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/>
                    <line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* WTS Lightbox */}
      {wtsLightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.88)' }} onClick={() => setWtsLightbox(null)}>
          <div className="relative w-[95vw] h-[90vh] md:w-[75vw] md:h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 font-ui text-white text-xs" style={{ letterSpacing: '1px', background: 'rgba(0,0,0,0.5)', padding: '3px 10px', borderRadius: '3px' }}>
              {wtsLightbox.index + 1} / {wtsLightbox.photos.length}
            </div>
            <button onClick={() => setWtsLightbox(null)} className="absolute top-3 right-3 z-10 text-white/70 hover:text-white transition-colors flex items-center justify-center font-ui text-sm" style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '4px', width: '32px', height: '32px' }} aria-label="Close lightbox">✕</button>
            <img src={wtsLightbox.photos[wtsLightbox.index]} alt="" className="w-full h-full" style={{ objectFit: 'contain' }} />
            {wtsLightbox.photos.length > 1 && (
              <button onClick={() => setWTSLightboxIndex((wtsLightbox.index - 1 + wtsLightbox.photos.length) % wtsLightbox.photos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-white flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '4px', width: '40px', height: '48px', fontSize: '24px' }} aria-label="Previous photo">‹</button>
            )}
            {wtsLightbox.photos.length > 1 && (
              <button onClick={() => setWTSLightboxIndex((wtsLightbox.index + 1) % wtsLightbox.photos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '4px', width: '40px', height: '48px', fontSize: '24px' }} aria-label="Next photo">›</button>
            )}
          </div>
        </div>
      )}

      {/* RSVP Lightbox */}
      {isRSVPOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        >
          <div className="absolute inset-0 bg-black/75" onClick={closeRSVP} />

          <div
            style={{
              background: '#191b25',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8"
          >
            <button
              onClick={closeRSVP}
              className="absolute top-4 right-5 text-white/40 hover:text-white transition-colors text-lg leading-none"
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="font-display text-2xl font-bold text-white mb-1">RSVP</h2>
            <p className="font-ui text-white/50 text-sm mb-6">We look forward to seeing you!</p>

            {status === 'success' ? (
              <div className="text-center py-8">
                <p className="font-display text-white text-2xl mb-3">You&apos;re in.</p>
                <p className="font-ui text-white/50 text-sm mb-8">We can&apos;t wait to see you.</p>
                <button
                  onClick={closeRSVP}
                  style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '6px', letterSpacing: '1px' }}
                  className="font-ui px-8 py-3 text-white text-xs font-bold uppercase hover:opacity-70 transition-opacity"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-ui block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">First Name</label>
                    <input
                      required type="text" name="firstName"
                      value={formData.firstName} onChange={handleChange}
                      style={inputStyle}
                      className="w-full p-3 text-white text-sm focus:outline-none focus:border-white/40 transition placeholder:text-white/20"
                    />
                  </div>
                  <div>
                    <label className="font-ui block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Last Name</label>
                    <input
                      required type="text" name="lastName"
                      value={formData.lastName} onChange={handleChange}
                      style={inputStyle}
                      className="w-full p-3 text-white text-sm focus:outline-none focus:border-white/40 transition placeholder:text-white/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-ui block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Email</label>
                  <input
                    required type="email" name="email"
                    value={formData.email} onChange={handleChange}
                    style={inputStyle}
                    className="w-full p-3 text-white text-sm focus:outline-none focus:border-white/40 transition placeholder:text-white/20"
                  />
                </div>

                <div>
                  <label className="font-ui block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Will you be attending</label>
                  <select
                    name="attending" value={formData.attending} onChange={handleChange}
                    style={selectStyle}
                    className="w-full p-3 text-white text-sm focus:outline-none transition"
                  >
                    <option value="Enthusiastically Yes">Enthusiastically Yes!</option>
                    <option value="Regretfully No">Regretfully No</option>
                  </select>
                </div>

                {formData.attending !== 'Regretfully No' && (
                  <>
                    <div className="grid grid-cols-3 gap-4 items-end">
                      <div className="col-span-1">
                        <label className="font-ui block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Plus One?</label>
                        <select
                          name="plusOne" value={formData.plusOne} onChange={handleChange}
                          style={selectStyle}
                          className="w-full p-3 text-white text-sm focus:outline-none transition"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      {formData.plusOne === 'Yes' && (
                        <div className="col-span-2">
                          <label className="font-ui block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Guest Name</label>
                          <input
                            required type="text" name="plusOneName"
                            value={formData.plusOneName} onChange={handleChange}
                            style={inputStyle}
                            className="w-full p-3 text-white text-sm focus:outline-none transition"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="font-ui block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Dietary Restrictions?</label>
                      <select
                        name="dietaryRestrictions" value={formData.dietaryRestrictions} onChange={handleChange}
                        style={selectStyle}
                        className="w-full p-3 text-white text-sm focus:outline-none transition mb-3"
                      >
                        <option value="No">No Restrictions</option>
                        <option value="Yes">Yes, I have restrictions</option>
                      </select>
                      {formData.dietaryRestrictions === 'Yes' && (
                        <textarea
                          name="dietDetail" value={formData.dietDetail} onChange={handleChange}
                          placeholder="e.g., Vegan, Gluten-Free, Peanut Allergy..."
                          style={inputStyle}
                          className="w-full p-3 text-white text-sm focus:outline-none transition h-20 resize-none placeholder:text-white/25"
                        />
                      )}
                    </div>
                  </>
                )}

                {status === 'error' && (
                  <p className="font-ui text-red-400 text-sm text-center">Something went wrong. Please try again.</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    letterSpacing: '1px',
                  }}
                  className="font-ui w-full py-4 text-white font-bold uppercase text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm RSVP'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </main>
  );
}
