'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { applyMonochromeStyle } from '@/lib/mapStyle'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

type ComparePoint = { id: string; lat: number; lng: number; name: string };

type MarkerRef = {
  type: string;
  el: HTMLElement;
  id: string;
  lat: number;
  lng: number;
  name: string;
};

declare global {
  interface Window {
    __propertyPhotos: Record<string, { photos: string[]; index: number }>;
    __clickPhoto: (id: string) => void;
    __prevPhoto: (id: string) => void;
    __nextPhoto: (id: string) => void;
    __compareA: ComparePoint | null;
    __propertyRegistry: Record<string, { lat: number; lng: number; name: string; type: string }>;
    __setCompareA: (id: string) => void;
    __resetCompare: () => void;
  }
}

type Property = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  type: string;
  phone: string;
  website: string;
  contact: string;
  notes: string;
  photos: string[];
};

type LightboxState = { photos: string[]; index: number } | null;

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

function typeColor(type: string): string {
  return TYPE_COLOR[type] ?? '#444';
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const PILL_STYLE =
  'background:#191b25;color:#fff;padding:6px 14px;border-radius:20px;font-family:\'OpenSauceOne\',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.5px;white-space:nowrap;';

function buildPopupHTML(p: Property): string {
  const color = typeColor(p.type);
  const badge = `<span style="display:inline-block;padding:2px 10px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;background:${color}">${p.type}</span>`;
  const phone = p.phone ? `<p style="margin:6px 0 0;font-size:13px;color:#000">${p.phone}</p>` : '';
  const website = p.website
    ? `<a href="${p.website}" target="_blank" rel="noopener noreferrer" style="display:block;margin:6px 0 0;font-size:13px;font-weight:700;color:${color};text-decoration:underline;">${p.type} Link</a>`
    : '';
  const contact = p.contact ? `<p style="margin:6px 0 0;font-size:13px;color:#000">Contact: ${p.contact}</p>` : '';
  const notes = p.notes
    ? `<p style="margin:8px 0 0;font-size:13px;color:#000;opacity:0.8;font-weight:400;line-height:1.5">${p.notes}</p>`
    : '';

  const compareBtn =
    p.type !== 'Event Venue'
      ? `<button onclick="event.stopPropagation();console.log('[Compare] button clicked, id=${p.id}');window.__setCompareA('${p.id}')" style="margin-top:10px;display:block;width:100%;padding:5px 0;background:#191b25;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;font-family:'OpenSauceOne',Arial,sans-serif;">COMPARE</button>`
      : '';

  // stopPropagation prevents the click from reaching the map canvas and triggering closeOnClick
  const btnStyle = `position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:3px;width:28px;height:28px;font-size:18px;cursor:pointer;z-index:2;padding:0;line-height:1;display:flex;align-items:center;justify-content:center;`;

  let photoSection = '';
  if (p.photos.length > 0) {
    const arrows =
      p.photos.length > 1
        ? `<button onclick="event.stopPropagation();window.__prevPhoto('${p.id}')" style="${btnStyle}left:6px;">‹</button>
           <button onclick="event.stopPropagation();window.__nextPhoto('${p.id}')" style="${btnStyle}right:6px;">›</button>
           <span id="popup-counter-${p.id}" style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.5);color:#fff;font-size:11px;padding:2px 8px;border-radius:3px;z-index:2;white-space:nowrap;">1 / ${p.photos.length}</span>`
        : '';
    photoSection = `
      <div style="position:relative;overflow:hidden;border-radius:4px 4px 0 0;">
        <img id="popup-img-${p.id}" src="${p.photos[0]}" onclick="window.__clickPhoto('${p.id}')"
          style="width:100%;height:140px;object-fit:cover;display:block;cursor:pointer;" />
        ${arrows}
      </div>`;
  }

  return `
    <div style="font-family:'OpenSauceOne',Arial,sans-serif;min-width:220px;max-width:260px;overflow:hidden;border-radius:4px">
      ${photoSection}
      <div style="padding:12px 14px 14px">
        ${badge}
        <h3 style="margin:8px 0 4px;font-size:15px;font-weight:700;color:#000;line-height:1.3">${p.name}</h3>
        <p style="margin:0;font-size:12px;color:#000;line-height:1.4">${p.address}</p>
        ${phone}${website}${contact}${notes}${compareBtn}
      </div>
    </div>`;
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M1 1h4v1.5H2.5V5H1V1zm8 0h4v4h-1.5V2.5H9V1zM1 9h1.5v2.5H5V13H1V9zm11 2.5H9.5V13H13V9h-1.5v2.5z" />
    </svg>
  );
}

function CompressIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M4 1v3H1v1.5h4.5V1H4zm5.5 0V5.5H14V4h-3V1H9.5zM1 8.5V10h3v3h1.5V8.5H1zm8.5 0V13H11v-3h3V8.5H9.5z" />
    </svg>
  );
}

function createMarkerElement(p: Property): HTMLElement | null {
  const iconSrc = ICON_MAP[p.type];
  if (!iconSrc) return null;
  const img = document.createElement('img');
  img.src = iconSrc;
  img.alt = p.type;
  if (p.type === 'Event Venue') {
    img.style.cssText =
      'width:50px;height:50px;object-fit:contain;cursor:pointer;display:block;transition:opacity 250ms ease;';
  } else {
    img.style.cssText =
      'width:40px;height:40px;object-fit:contain;cursor:pointer;display:block;transition:opacity 250ms ease;';
  }
  return img;
}

export default function WhereToStay() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<MarkerRef[]>([]);

  const [mapExpanded, setMapExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(() => new Set());

  // Photo bridge + compare state initialisation
  useEffect(() => {
    window.__propertyPhotos = {};
    window.__compareA = null;
    window.__propertyRegistry = {};
    // Stubs overwritten by the map load handler once the map is ready
    window.__setCompareA = (id) => console.warn('[Compare] __setCompareA called before map loaded', id);
    window.__resetCompare = () => console.warn('[Compare] __resetCompare called before map loaded');

    window.__clickPhoto = (id: string) => {
      const data = window.__propertyPhotos[id];
      if (data) setLightbox({ photos: data.photos, index: data.index });
    };

    window.__prevPhoto = (id: string) => {
      const data = window.__propertyPhotos[id];
      if (!data) return;
      data.index = (data.index - 1 + data.photos.length) % data.photos.length;
      const img = document.getElementById(`popup-img-${id}`) as HTMLImageElement | null;
      if (img) img.src = data.photos[data.index];
      const counter = document.getElementById(`popup-counter-${id}`);
      if (counter) counter.textContent = `${data.index + 1} / ${data.photos.length}`;
    };

    window.__nextPhoto = (id: string) => {
      const data = window.__propertyPhotos[id];
      if (!data) return;
      data.index = (data.index + 1) % data.photos.length;
      const img = document.getElementById(`popup-img-${id}`) as HTMLImageElement | null;
      if (img) img.src = data.photos[data.index];
      const counter = document.getElementById(`popup-counter-${id}`);
      if (counter) counter.textContent = `${data.index + 1} / ${data.photos.length}`;
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

      // Route layer management (closure vars shared by addRoute/removeRoute/fetchRoute)
      let routePopup: mapboxgl.Popup | null = null;

      const removeRoute = () => {
        routePopup?.remove();
        routePopup = null;
        if (map.current?.getLayer('compare-route')) map.current.removeLayer('compare-route');
        if (map.current?.getSource('compare-route')) map.current.removeSource('compare-route');
      };

      const addRoute = (geometry: object, midCoord: [number, number], label: string) => {
        console.log('[Compare] drawing route, label:', label, 'mid:', midCoord);
        removeRoute();
        if (!map.current) return;
        map.current.addSource('compare-route', {
          type: 'geojson' as const,
          data: { type: 'Feature' as const, properties: {}, geometry: geometry as GeoJSON.Geometry },
        });
        map.current.addLayer({
          id: 'compare-route',
          type: 'line',
          source: 'compare-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#191b25', 'line-width': 3, 'line-dasharray': [2, 2] },
        });
        routePopup = new mapboxgl.Popup({
          closeButton: false,
          anchor: 'bottom',
          offset: [0, -6],
          className: 'compare-pill',
        })
          .setLngLat(midCoord)
          .setHTML(`<div style="${PILL_STYLE}">${label}</div>`)
          .addTo(map.current);
        console.log('[Compare] route drawn successfully');
      };

      const fetchRoute = async (a: ComparePoint, b: ComparePoint) => {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${a.lng},${a.lat};${b.lng},${b.lat}?geometries=geojson&access_token=${token}`;
        const straightMid: [number, number] = [(a.lng + b.lng) / 2, (a.lat + b.lat) / 2];
        console.log('[Compare] fetching directions, URL:', url);

        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`API error ${res.status}`);
          const data = await res.json();
          const route = data.routes?.[0];
          if (!route) throw new Error('No route in response');
          console.log('[Compare] directions received, duration:', route.duration, 'distance:', route.distance);

          const coords: [number, number][] = route.geometry.coordinates;
          const routeMid = coords[Math.floor(coords.length / 2)] ?? straightMid;
          const mins = Math.round(route.duration / 60);
          const mi = (route.distance / 1609.34).toFixed(1);
          addRoute(route.geometry, routeMid, `${mins} min · ${mi} mi`);
        } catch (err) {
          console.warn('[Compare] directions failed, using Haversine fallback:', err);
          const dist = haversineMiles(a.lat, a.lng, b.lat, b.lng);
          addRoute(
            { type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
            straightMid,
            `${dist.toFixed(1)} mi (straight line)`,
          );
        }
      };

      // Compare bridge functions (defined here so they close over removeRoute/markerRefs)
      window.__setCompareA = (id: string) => {
        console.log('[Compare] __setCompareA called, id:', id);
        const prop = window.__propertyRegistry[id];
        if (!prop) {
          console.warn('[Compare] property not found in registry for id:', id, 'registry keys:', Object.keys(window.__propertyRegistry));
          return;
        }
        // Remove highlight from previous A
        if (window.__compareA) {
          const prev = markerRefs.current.find(r => r.id === window.__compareA!.id);
          if (prev) { prev.el.style.outline = ''; prev.el.style.outlineOffset = ''; prev.el.style.borderRadius = ''; }
        }
        window.__compareA = { id, lat: prop.lat, lng: prop.lng, name: prop.name };
        console.log('[Compare] Point A locked:', window.__compareA);
        // Highlight new A
        const ref = markerRefs.current.find(r => r.id === id);
        if (ref) {
          ref.el.style.outline = '2px solid rgba(255,255,255,0.9)';
          ref.el.style.outlineOffset = '3px';
          ref.el.style.borderRadius = '4px';
          console.log('[Compare] highlight applied to marker element');
        } else {
          console.warn('[Compare] marker element not found in refs for id:', id);
        }
      };

      window.__resetCompare = () => {
        console.log('[Compare] resetting compare mode');
        if (window.__compareA) {
          const ref = markerRefs.current.find(r => r.id === window.__compareA!.id);
          if (ref) { ref.el.style.outline = ''; ref.el.style.outlineOffset = ''; ref.el.style.borderRadius = ''; }
          window.__compareA = null;
        }
        removeRoute();
      };

      // Fetch and render properties
      fetch('/api/properties')
        .then(r => r.json())
        .then((properties: Property[]) => {
          const bounds = new mapboxgl.LngLatBounds();
          let hasMarkers = false;

          properties.forEach(p => {
            if (p.lat == null || p.lng == null) return;
            hasMarkers = true;
            bounds.extend([p.lng, p.lat]);

            if (p.photos.length > 0) {
              window.__propertyPhotos[p.id] = { photos: p.photos, index: 0 };
            }
            window.__propertyRegistry[p.id] = { lat: p.lat, lng: p.lng, name: p.name, type: p.type };

            const popup = new mapboxgl.Popup({ maxWidth: '280px', offset: 14 })
              .setHTML(buildPopupHTML(p));

            // Reset compare on any popup close
            popup.on('close', () => window.__resetCompare?.());

            const customEl = createMarkerElement(p);
            let markerEl: HTMLElement;

            if (customEl) {
              new mapboxgl.Marker({ element: customEl, anchor: 'bottom' })
                .setLngLat([p.lng, p.lat])
                .setPopup(popup)
                .addTo(map.current!);
              markerEl = customEl;
            } else {
              const fallback = new mapboxgl.Marker({ color: typeColor(p.type) })
                .setLngLat([p.lng, p.lat])
                .setPopup(popup)
                .addTo(map.current!);
              markerEl = fallback.getElement();
              markerEl.style.transition = 'opacity 250ms ease';
            }

            markerRefs.current.push({ type: p.type, el: markerEl, id: p.id, lat: p.lat, lng: p.lng, name: p.name });

            // Point B detection: click while compare A is active
            if (p.type !== 'Event Venue') {
              markerEl.addEventListener('click', () => {
                const a = window.__compareA;
                if (!a || a.id === p.id) return;
                const fitBounds = new mapboxgl.LngLatBounds();
                fitBounds.extend([a.lng, a.lat]);
                fitBounds.extend([p.lng!, p.lat!]);
                map.current!.fitBounds(fitBounds, { padding: 100, duration: 800 });
                fetchRoute(a, { id: p.id, lat: p.lat!, lng: p.lng!, name: p.name });
              });
            }
          });

          if (hasMarkers) {
            map.current!.fitBounds(bounds, { padding: 80, maxZoom: 14 });
          }
        })
        .catch(console.error);
    });

    return () => {
      markerRefs.current = [];
      window.__compareA = null;
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, []);

  // Sync marker visibility with filter state
  useEffect(() => {
    markerRefs.current.forEach(({ type, el }) => {
      const visible = activeTypes.size === 0 || activeTypes.has(type);
      el.style.opacity = visible ? '1' : '0';
      el.style.pointerEvents = visible ? 'auto' : 'none';
    });
  }, [activeTypes]);

  const toggleType = (type: string) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const toggleMap = () => {
    setMapExpanded(prev => {
      setTimeout(() => map.current?.resize(), 370);
      return !prev;
    });
  };

  const setLightboxIndex = (index: number) => {
    setLightbox(prev => (prev ? { ...prev, index } : null));
  };

  return (
    <main style={{ background: '#191b25' }} className="min-h-screen text-white">

      {/* Hero */}
      <section
        style={{ background: 'linear-gradient(to top, #191b25 27%, #131417 91%)' }}
        className="flex flex-col items-center text-center px-6 pt-16 pb-12"
      >
        <img src="/CD_logo.svg" alt="Castlewave" className="w-28 md:w-36 mb-10" />

        <h1
          className="font-display text-white font-bold tracking-wide mb-10"
          style={{ fontSize: '36px' }}
        >
          WHERE TO STAY
        </h1>

        <p
          className="font-ui font-bold text-white text-base mb-14"
          style={{ letterSpacing: '1px', maxWidth: '661px', lineHeight: '1.8' }}
        >
          Miami has something for everyone; and the event will be easily accessible from wherever
          you decide to stay. We have compiled options for hotels and Airbnbs to help cut down on
          the search. With that said — these are just suggestions for those less familiar with the
          Miami area. If you know where you want to stay, don&apos;t let our suggestions dissuade
          you! Our hospitality partners have graciously offered a discount for our guests at their
          respective properties, and those details are included in each listing below.
        </p>

        <Link
          href="/"
          style={{
            background: '#191b25',
            borderRadius: '6px',
            height: '75px',
            minWidth: '279px',
            letterSpacing: '1px',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
          className="font-ui flex items-center justify-center text-white font-bold uppercase text-sm px-8 transition-opacity duration-150 hover:opacity-70"
        >
          BACK TO MAIN
        </Link>
      </section>

      {/* Map + filters */}
      <div className="px-6 py-12 flex justify-center">
        <div
          className="w-full mx-auto"
          style={{ maxWidth: mapExpanded ? '100%' : '1164px', transition: 'max-width 0.35s ease' }}
        >
          {/* Filter toggles */}
          <div className="flex flex-wrap gap-2 mb-4">
            {ALL_TYPES.map(type => {
              const active = activeTypes.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  style={{
                    background: active ? '#191b25' : '#ffffff',
                    color: active ? '#ffffff' : '#191b25',
                    border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : '#191b25'}`,
                    borderRadius: '6px',
                    padding: '4px 10px',
                    letterSpacing: '1px',
                    fontSize: '11px',
                  }}
                  className="font-ui font-bold uppercase cursor-pointer transition-colors duration-150"
                >
                  {type}
                </button>
              );
            })}
          </div>

          {/* Map */}
          <div
            style={{ borderRadius: '6px', overflow: 'hidden', position: 'relative' }}
            className="w-full h-[438px] md:h-[625px]"
          >
            <div ref={mapContainer} className="w-full h-full" />

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative w-[95vw] h-[90vh] md:w-[75vw] md:h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-10 font-ui text-white text-xs"
              style={{ letterSpacing: '1px', background: 'rgba(0,0,0,0.5)', padding: '3px 10px', borderRadius: '3px' }}
            >
              {lightbox.index + 1} / {lightbox.photos.length}
            </div>

            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 z-10 text-white/70 hover:text-white transition-colors flex items-center justify-center font-ui text-sm"
              style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '4px', width: '32px', height: '32px' }}
              aria-label="Close lightbox"
            >
              ✕
            </button>

            <img src={lightbox.photos[lightbox.index]} alt="" className="w-full h-full" style={{ objectFit: 'contain' }} />

            {lightbox.photos.length > 1 && (
              <button
                onClick={() => setLightboxIndex((lightbox.index - 1 + lightbox.photos.length) % lightbox.photos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-white hover:text-white/80 transition-colors flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '4px', width: '40px', height: '48px', fontSize: '24px' }}
                aria-label="Previous photo"
              >
                ‹
              </button>
            )}

            {lightbox.photos.length > 1 && (
              <button
                onClick={() => setLightboxIndex((lightbox.index + 1) % lightbox.photos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white hover:text-white/80 transition-colors flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '4px', width: '40px', height: '48px', fontSize: '24px' }}
                aria-label="Next photo"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}

    </main>
  );
}
