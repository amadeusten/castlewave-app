'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { applyMonochromeStyle } from '@/lib/mapStyle'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

declare global {
  interface Window {
    __propertyPhotos: Record<string, { photos: string[]; index: number }>;
    __clickPhoto: (id: string) => void;
    __prevPhoto: (id: string) => void;
    __nextPhoto: (id: string) => void;
  }
}

type MarkerRef = {
  type: string;
  el: HTMLElement;
  id: string;
  lat: number;
  lng: number;
  name: string;
  marker: mapboxgl.Marker;
  popup: mapboxgl.Popup;
};

type Property = {
  id: string; name: string; address: string;
  lat: number | null; lng: number | null;
  type: string; phone: string; website: string;
  contact: string; notes: string; photos: string[];
};

type LightboxState = { photos: string[]; index: number } | null;
type RouteStep = 'idle' | 'select-a' | 'select-b' | 'drawn';

const ALL_TYPES = ['Hotel', 'Airbnb', 'Restaurant', 'Experience', 'Airport', 'Event Venue'];

const ICON_MAP: Record<string, string> = {
  'Hotel': '/icons/hotel.png',
  'Airbnb': '/icons/airbnb.png',
  'Restaurant': '/icons/restaurant.png',
  'Experience': '/icons/experience.png',
  'Airport': '/icons/airport.png',
  'Event Venue': '/icons/mirrorball.png',
};

const TYPE_COLOR: Record<string, string> = {
  'Hotel': '#1b3d6e',
  'Airbnb': '#a04d90',
  'Restaurant': '#c0392b',
  'Experience': '#27ae60',
  'Airport': '#2980b9',
  'Event Venue': '#e67e22',
};

const PILL_STYLE = "background:#191b25;color:#fff;padding:6px 14px;border-radius:20px;font-family:'OpenSauceOne',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.5px;white-space:nowrap;";

const MAP_BTN: React.CSSProperties = {
  background: '#191b25',
  borderRadius: '6px',
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '1px',
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#ffffff',
  cursor: 'pointer',
  textTransform: 'uppercase',
  fontFamily: "'OpenSauceOne', Arial, sans-serif",
};

function typeColor(t: string) { return TYPE_COLOR[t] ?? '#444'; }

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8, r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function buildPopupHTML(p: Property): string {
  const color = typeColor(p.type);
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

function ExpandIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M1 1h4v1.5H2.5V5H1V1zm8 0h4v4h-1.5V2.5H9V1zM1 9h1.5v2.5H5V13H1V9zm11 2.5H9.5V13H13V9h-1.5v2.5z"/></svg>;
}
function CompressIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M4 1v3H1v1.5h4.5V1H4zm5.5 0V5.5H14V4h-3V1H9.5zM1 8.5V10h3v3h1.5V8.5H1zm8.5 0V13H11v-3h3V8.5H9.5z"/></svg>;
}

function createMarkerElement(p: Property): HTMLElement | null {
  const src = ICON_MAP[p.type];
  if (!src) return null;
  const img = document.createElement('img');
  img.src = src;
  img.alt = p.type;
  img.style.cssText = p.type === 'Event Venue'
    ? 'width:50px;height:50px;object-fit:contain;cursor:pointer;display:block;transition:opacity 250ms ease;'
    : 'width:40px;height:40px;object-fit:contain;cursor:pointer;display:block;transition:opacity 250ms ease;';
  return img;
}

export default function WhereToStay() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<MarkerRef[]>([]);

  // Route mode refs (accessible inside event listeners without stale closures)
  const routeModeRef = useRef(false);
  const routePointARef = useRef<MarkerRef | null>(null);
  const routePointBRef = useRef<MarkerRef | null>(null);
  const removeRouteRef = useRef<() => void>(() => {});

  // Tracks the currently open popup so we can close it before opening another
  const openPopupRef = useRef<mapboxgl.Popup | null>(null);

  // Filter dropdown ref for outside-click detection
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [mapExpanded, setMapExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [routeMode, setRouteMode] = useState(false);
  const [routeStep, setRouteStep] = useState<RouteStep>('idle');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(() => new Set());

  // Photo bridge
  useEffect(() => {
    window.__propertyPhotos = {};
    window.__clickPhoto = (id) => {
      const d = window.__propertyPhotos[id];
      if (d) setLightbox({ photos: d.photos, index: d.index });
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

  // Map init
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-80.1918, 25.7617],
      zoom: 11,
    });

    map.current.on('load', () => {
      applyMonochromeStyle(map.current!);

      // ── Route layer helpers (closure vars) ──────────────────────────────────
      let routeInfoPopup: mapboxgl.Popup | null = null;

      const removeRoute = () => {
        routeInfoPopup?.remove();
        routeInfoPopup = null;
        if (map.current?.getLayer('see-route')) map.current.removeLayer('see-route');
        if (map.current?.getSource('see-route')) map.current.removeSource('see-route');
      };
      removeRouteRef.current = removeRoute;

      const addRoute = (geometry: object, mid: [number, number], label: string) => {
        removeRoute();
        if (!map.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.current.addSource('see-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry } } as any);
        map.current.addLayer({
          id: 'see-route', type: 'line', source: 'see-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#191b25', 'line-width': 3, 'line-dasharray': [2, 2] },
        });
        routeInfoPopup = new mapboxgl.Popup({ closeButton: false, anchor: 'bottom', offset: [0, -6], className: 'compare-pill' })
          .setLngLat(mid)
          .setHTML(`<div style="${PILL_STYLE}">${label}</div>`)
          .addTo(map.current);
      };

      const fetchRoute = async (a: MarkerRef, b: MarkerRef) => {
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
          addRoute(route.geometry, routeMid, `${Math.round(route.duration / 60)} min · ${(route.distance / 1609.34).toFixed(1)} mi`);
        } catch {
          const dist = haversineMiles(a.lat, a.lng, b.lat, b.lng);
          addRoute({ type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] }, mid, `${dist.toFixed(1)} mi (straight line)`);
        }
      };

      // ── Properties ──────────────────────────────────────────────────────────
      fetch('/api/properties')
        .then(r => r.json())
        .then((properties: Property[]) => {
          const bounds = new mapboxgl.LngLatBounds();
          let hasMarkers = false;

          properties.forEach(p => {
            if (p.lat == null || p.lng == null) return;
            hasMarkers = true;
            bounds.extend([p.lng, p.lat]);
            if (p.photos.length > 0) window.__propertyPhotos[p.id] = { photos: p.photos, index: 0 };

            const popup = new mapboxgl.Popup({ maxWidth: '280px', offset: 14, closeOnClick: false })
              .setHTML(buildPopupHTML(p));

            popup.on('open', () => {
              if (openPopupRef.current && openPopupRef.current !== popup) {
                openPopupRef.current.remove();
              }
              openPopupRef.current = popup;
            });
            popup.on('close', () => {
              if (openPopupRef.current === popup) openPopupRef.current = null;
            });

            const customEl = createMarkerElement(p);
            let markerEl: HTMLElement;
            let markerInstance: mapboxgl.Marker;

            if (customEl) {
              markerInstance = new mapboxgl.Marker({ element: customEl, anchor: 'bottom' })
                .setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map.current!);
              markerEl = customEl;
            } else {
              markerInstance = new mapboxgl.Marker({ color: typeColor(p.type) })
                .setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map.current!);
              markerEl = markerInstance.getElement();
              markerEl.style.transition = 'opacity 250ms ease';
            }

            const markerRef: MarkerRef = { type: p.type, el: markerEl, id: p.id, lat: p.lat, lng: p.lng, name: p.name, marker: markerInstance, popup };
            markerRefs.current.push(markerRef);

            // Route mode: click selects points instead of opening popup
            markerEl.addEventListener('click', () => {
              if (!routeModeRef.current) return;

              if (!routePointARef.current) {
                routePointARef.current = markerRef;
                markerEl.style.boxShadow = '0 0 0 2px #000000';
                setRouteStep('select-b');
              } else if (!routePointBRef.current && routePointARef.current.id !== p.id) {
                routePointBRef.current = markerRef;
                markerEl.style.boxShadow = '0 0 0 2px #000000';
                setRouteStep('drawn');
                const fb = new mapboxgl.LngLatBounds();
                fb.extend([routePointARef.current.lng, routePointARef.current.lat]);
                fb.extend([p.lng!, p.lat!]);
                map.current!.fitBounds(fb, { padding: 100, duration: 800 });
                fetchRoute(routePointARef.current, markerRef);
              }
            });
          });

          if (hasMarkers) map.current!.fitBounds(bounds, { padding: 80, maxZoom: 14 });
        })
        .catch(console.error);
    });

    return () => {
      markerRefs.current = [];
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, []);

  // Filter visibility
  useEffect(() => {
    markerRefs.current.forEach(({ type, el }) => {
      const visible = selectedTypes.size === 0 || selectedTypes.has(type);
      el.style.opacity = visible ? '1' : '0';
      el.style.pointerEvents = visible ? 'auto' : 'none';
    });
  }, [selectedTypes]);

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  // ── Route mode controls ────────────────────────────────────────────────────
  const enterRouteMode = () => {
    routeModeRef.current = true;
    routePointARef.current = null;
    routePointBRef.current = null;
    setRouteMode(true);
    setRouteStep('select-a');
    markerRefs.current.forEach(r => r.marker.setPopup(null));
  };

  const exitRouteMode = () => {
    routeModeRef.current = false;
    if (routePointARef.current) routePointARef.current.el.style.boxShadow = '';
    if (routePointBRef.current) routePointBRef.current.el.style.boxShadow = '';
    routePointARef.current = null;
    routePointBRef.current = null;
    markerRefs.current.forEach(r => r.marker.setPopup(r.popup));
    setRouteMode(false);
    setRouteStep('idle');
    removeRouteRef.current();
  };

  // ── Filter controls ────────────────────────────────────────────────────────
  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      // Treat empty set as "all selected" so unchecking one excludes just that type
      const effective = prev.size === 0 ? new Set(ALL_TYPES) : new Set(prev);
      if (effective.has(type)) effective.delete(type); else effective.add(type);
      // If all selected again, collapse to empty (no filter)
      return effective.size === ALL_TYPES.length ? new Set<string>() : effective;
    });
  };

  const removeFilterType = (type: string) => {
    setSelectedTypes(prev => { const n = new Set(prev); n.delete(type); return n; });
  };

  const toggleMap = () => { setMapExpanded(p => { setTimeout(() => map.current?.resize(), 370); return !p; }); };
  const setLightboxIndex = (i: number) => setLightbox(p => p ? { ...p, index: i } : null);

  const allFiltersActive = selectedTypes.size === 0;
  const activeFilterList = [...selectedTypes];

  const INSTRUCTION = routeStep === 'select-a' ? 'Select your first location' : 'Now select your second location';

  return (
    <main style={{ background: '#191b25' }} className="min-h-screen text-white">

      {/* Hero */}
      <section
        style={{ background: 'linear-gradient(to top, #191b25 27%, #131417 91%)' }}
        className="flex flex-col items-center text-center px-6 pt-16 pb-12"
      >
        <img src="/CD_logo.svg" alt="Castlewave" className="w-28 md:w-36 mb-10" />
        <h1 className="font-display text-white font-bold tracking-wide mb-10" style={{ fontSize: '36px' }}>
          WHERE TO STAY
        </h1>
        <p className="font-ui font-bold text-white text-base mb-14" style={{ letterSpacing: '1px', maxWidth: '661px', lineHeight: '1.8' }}>
          Miami has something for everyone; and the event will be easily accessible from wherever
          you decide to stay. We have compiled options for hotels and Airbnbs to help cut down on
          the search. With that said — these are just suggestions for those less familiar with the
          Miami area. If you know where you want to stay, don&apos;t let our suggestions dissuade
          you! Our hospitality partners have graciously offered discounted rates for our guests, 
          and those details are included in each listing below.  
          For any additional recommendations, let us know, and we'll be happy to help you narrow your search.
        </p>
        <Link href="/"
          style={{ background: '#191b25', borderRadius: '6px', height: '75px', minWidth: '279px', letterSpacing: '1px', border: '1px solid rgba(255,255,255,0.15)' }}
          className="font-ui flex items-center justify-center text-white font-bold uppercase text-sm px-8 transition-opacity duration-150 hover:opacity-70"
        >
          BACK TO MAIN
        </Link>
      </section>

      {/* Map + controls */}
      <div className="px-6 py-12 flex justify-center">
        <div className="w-full mx-auto" style={{ maxWidth: mapExpanded ? '100%' : '1164px', transition: 'max-width 0.35s ease' }}>

          {/* Filter dropdown — left-aligned above map */}
          <div ref={dropdownRef} className="relative inline-block mb-3">
            <button
              onClick={(e) => { e.stopPropagation(); setFilterOpen(f => !f); }}
              className="font-ui font-bold flex items-center gap-2"
              style={{ ...MAP_BTN, padding: '6px 12px' }}
            >
              {allFiltersActive ? (
                <span>All Properties</span>
              ) : (
                <span className="flex flex-wrap gap-1 items-center">
                  {activeFilterList.map(type => (
                    <span key={type} className="flex items-center gap-1"
                      style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '3px', padding: '1px 4px 1px 6px' }}>
                      <span>{type}</span>
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); removeFilterType(type); }}
                        className="text-white/70 hover:text-white leading-none"
                        style={{ fontSize: '13px', padding: '0 1px', cursor: 'pointer' }}
                        aria-label={`Remove ${type} filter`}
                      >×</span>
                    </span>
                  ))}
                </span>
              )}
              <span style={{ fontSize: '8px', opacity: 0.5, marginLeft: '2px' }}>{filterOpen ? '▲' : '▼'}</span>
            </button>

            {filterOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: '#191b25', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '12px 14px', minWidth: '180px', zIndex: 30 }}>
                <p className="font-ui font-bold uppercase" style={{ fontSize: '11px', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                  Show only:
                </p>
                {ALL_TYPES.map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer" style={{ padding: '4px 0' }}>
                    <input
                      type="checkbox"
                      checked={allFiltersActive || selectedTypes.has(type)}
                      onChange={() => toggleType(type)}
                      style={{ cursor: 'pointer', accentColor: '#ffffff' }}
                    />
                    <span className="font-ui font-bold uppercase text-white" style={{ fontSize: '11px', letterSpacing: '1px' }}>{type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <div style={{ borderRadius: '6px', overflow: 'hidden', position: 'relative' }} className="w-full h-[438px] md:h-[625px]">
            <div ref={mapContainer} className="w-full h-full" />

            {/* Route mode instruction bar */}
            {routeMode && routeStep !== 'drawn' && (
              <div
                className="absolute left-1/2 -translate-x-1/2 z-10 animate-fade-in"
                style={{ top: '12px', background: '#191b25', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '8px 16px', fontFamily: "'OpenSauceOne', Arial, sans-serif", fontSize: '13px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}
              >
                {INSTRUCTION}
              </div>
            )}

            {/* See Routes / Clear Route */}
            <button
              onClick={routeMode ? exitRouteMode : enterRouteMode}
              className="absolute top-3 z-10 transition-opacity hover:opacity-70"
              style={{ ...MAP_BTN, right: '44px' }}
            >
              {routeMode ? 'CLEAR ROUTE' : 'SEE ROUTES'}
            </button>

            {/* Expand / compress */}
            <button
              onClick={toggleMap}
              aria-label={mapExpanded ? 'Compress map' : 'Expand map'}
              className="absolute top-3 right-3 z-10 text-white/80 hover:text-white transition-colors flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', borderRadius: '4px', width: '30px', height: '30px' }}
            >
              {mapExpanded ? <CompressIcon /> : <ExpandIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.88)' }} onClick={() => setLightbox(null)}>
          <div className="relative w-[95vw] h-[90vh] md:w-[75vw] md:h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 font-ui text-white text-xs"
              style={{ letterSpacing: '1px', background: 'rgba(0,0,0,0.5)', padding: '3px 10px', borderRadius: '3px' }}>
              {lightbox.index + 1} / {lightbox.photos.length}
            </div>
            <button onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 z-10 text-white/70 hover:text-white transition-colors flex items-center justify-center font-ui text-sm"
              style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '4px', width: '32px', height: '32px' }}
              aria-label="Close lightbox">✕</button>
            <img src={lightbox.photos[lightbox.index]} alt="" className="w-full h-full" style={{ objectFit: 'contain' }} />
            {lightbox.photos.length > 1 && (
              <button onClick={() => setLightboxIndex((lightbox.index - 1 + lightbox.photos.length) % lightbox.photos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-white hover:text-white/80 transition-colors flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '4px', width: '40px', height: '48px', fontSize: '24px' }}
                aria-label="Previous photo">‹</button>
            )}
            {lightbox.photos.length > 1 && (
              <button onClick={() => setLightboxIndex((lightbox.index + 1) % lightbox.photos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white hover:text-white/80 transition-colors flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '4px', width: '40px', height: '48px', fontSize: '24px' }}
                aria-label="Next photo">›</button>
            )}
          </div>
        </div>
      )}

    </main>
  );
}
