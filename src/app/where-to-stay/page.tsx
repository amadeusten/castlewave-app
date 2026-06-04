'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

declare global {
  interface Window {
    __propertyPhotos: Record<string, { photos: string[]; index: number }>;
    __clickPhoto: (id: string) => void;
    __prevPhoto: (id: string) => void;
    __nextPhoto: (id: string) => void;
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

const TYPE_COLOR: Record<string, string> = {
  Hotel: '#1b3d6e',
  Airbnb: '#a04d90',
};

function typeColor(type: string): string {
  return TYPE_COLOR[type] ?? '#444';
}

function buildPopupHTML(p: Property): string {
  const color = typeColor(p.type);
  const badge = `<span style="display:inline-block;padding:2px 10px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;background:${color}">${p.type}</span>`;
  const phone = p.phone ? `<p style="margin:6px 0 0;font-size:13px;color:#555">${p.phone}</p>` : '';
  const website = p.website
    ? `<a href="${p.website}" target="_blank" rel="noopener noreferrer" style="display:block;margin:6px 0 0;font-size:13px;color:${color};text-decoration:underline;word-break:break-all">${p.website}</a>`
    : '';
  const contact = p.contact ? `<p style="margin:6px 0 0;font-size:13px;color:#555">Contact: ${p.contact}</p>` : '';
  const notes = p.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#555;opacity:0.8;font-weight:400;line-height:1.5">${p.notes}</p>` : '';

  const btnStyle = `position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:3px;width:28px;height:28px;font-size:18px;cursor:pointer;z-index:2;padding:0;line-height:1;display:flex;align-items:center;justify-content:center;`;

  let photoSection = '';
  if (p.photos.length > 0) {
    const arrows = p.photos.length > 1 ? `
      <button onclick="event.stopPropagation();window.__prevPhoto('${p.id}')" style="${btnStyle}left:6px;">‹</button>
      <button onclick="event.stopPropagation();window.__nextPhoto('${p.id}')" style="${btnStyle}right:6px;">›</button>
      <span id="popup-counter-${p.id}" style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.5);color:#fff;font-size:11px;padding:2px 8px;border-radius:3px;z-index:2;white-space:nowrap;">1 / ${p.photos.length}</span>
    ` : '';

    photoSection = `
      <div style="position:relative;overflow:hidden;border-radius:4px 4px 0 0;">
        <img
          id="popup-img-${p.id}"
          src="${p.photos[0]}"
          onclick="window.__clickPhoto('${p.id}')"
          style="width:100%;height:140px;object-fit:cover;display:block;cursor:pointer;"
        />
        ${arrows}
      </div>`;
  }

  return `
    <div style="font-family:'OpenSauceOne',Arial,sans-serif;min-width:220px;max-width:260px;overflow:hidden;border-radius:4px">
      ${photoSection}
      <div style="padding:12px 14px 14px">
        ${badge}
        <h3 style="margin:8px 0 4px;font-size:15px;font-weight:700;color:#111;line-height:1.3">${p.name}</h3>
        <p style="margin:0;font-size:12px;color:#777;line-height:1.4">${p.address}</p>
        ${phone}${website}${contact}${notes}
      </div>
    </div>`;
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M1 1h4v1.5H2.5V5H1V1zm8 0h4v4h-1.5V2.5H9V1zM1 9h1.5v2.5H5V13H1V9zm11 2.5H9.5V13H13V9h-1.5v2.5z"/>
    </svg>
  );
}

function CompressIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M4 1v3H1v1.5h4.5V1H4zm5.5 0V5.5H14V4h-3V1H9.5zM1 8.5V10h3v3h1.5V8.5H1zm8.5 0V13H11v-3h3V8.5H9.5z"/>
    </svg>
  );
}

export default function WhereToStay() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState>(null);

  // Wire up global popup↔React bridge
  useEffect(() => {
    window.__propertyPhotos = {};

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

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-80.1918, 25.7617],
      zoom: 11,
    });

    map.current.on('load', () => {
      ['poi-label', 'road-label', 'road-number-shield'].forEach(layer => {
        if (map.current?.getLayer(layer)) {
          map.current.setLayoutProperty(layer, 'visibility', 'none');
        }
      });

      fetch('/api/properties')
        .then(r => r.json())
        .then((properties: Property[]) => {
          const bounds = new mapboxgl.LngLatBounds();
          let hasMarkers = false;

          properties.forEach(p => {
            if (p.lat == null || p.lng == null) return;
            hasMarkers = true;
            bounds.extend([p.lng, p.lat]);

            // Register photos in the global bridge
            if (p.photos.length > 0) {
              window.__propertyPhotos[p.id] = { photos: p.photos, index: 0 };
            }

            const el = document.createElement('div');
            el.style.cssText = `
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: ${typeColor(p.type)};
              border: 2.5px solid #fff;
              cursor: pointer;
              box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            `;

            const popup = new mapboxgl.Popup({ maxWidth: '280px', offset: 14 })
              .setHTML(buildPopupHTML(p));

            new mapboxgl.Marker({ element: el })
              .setLngLat([p.lng, p.lat])
              .setPopup(popup)
              .addTo(map.current!);
          });

          if (hasMarkers) {
            map.current!.fitBounds(bounds, { padding: 60, maxZoom: 14 });
          }
        })
        .catch(console.error);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const toggleMap = () => {
    setMapExpanded(prev => {
      setTimeout(() => map.current?.resize(), 370);
      return !prev;
    });
  };

  const setLightboxIndex = (index: number) => {
    setLightbox(prev => prev ? { ...prev, index } : null);
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

      {/* Map */}
      <div className="px-6 py-12 flex justify-center">
        <div
          className="w-full mx-auto"
          style={{
            maxWidth: mapExpanded ? '100%' : '1164px',
            transition: 'max-width 0.35s ease',
          }}
        >
          <div
            style={{ borderRadius: '6px', overflow: 'hidden', position: 'relative' }}
            className="w-full h-[438px] md:h-[625px]"
          >
            <div ref={mapContainer} className="w-full h-full" />

            <button
              onClick={toggleMap}
              aria-label={mapExpanded ? 'Compress map' : 'Expand map'}
              className="absolute top-3 right-3 z-10 text-white/80 hover:text-white transition-colors flex items-center justify-center"
              style={{
                background: 'rgba(0,0,0,0.45)',
                borderRadius: '4px',
                width: '30px',
                height: '30px',
              }}
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
            {/* Counter */}
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-10 font-ui text-white text-xs"
              style={{ letterSpacing: '1px', background: 'rgba(0,0,0,0.5)', padding: '3px 10px', borderRadius: '3px' }}
            >
              {lightbox.index + 1} / {lightbox.photos.length}
            </div>

            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 z-10 text-white/70 hover:text-white transition-colors flex items-center justify-center font-ui text-sm"
              style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '4px', width: '32px', height: '32px' }}
              aria-label="Close lightbox"
            >
              ✕
            </button>

            {/* Photo */}
            <img
              src={lightbox.photos[lightbox.index]}
              alt=""
              className="w-full h-full"
              style={{ objectFit: 'contain' }}
            />

            {/* Prev */}
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

            {/* Next */}
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
