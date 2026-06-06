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

  const [guest, setGuest] = useState<Guest | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isRSVPOpen, setIsRSVPOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState(emptyForm);

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

  const openMap = () => {
    setIsMapOpen(prev => {
      const next = !prev;
      if (next) setTimeout(() => map.current?.resize(), 260);
      return next;
    });
  };

  const ctaButtons: { label: string; onClick?: () => void; href?: string; hidden?: boolean }[] = [
    { label: 'RSVP', onClick: openRSVP },
    { label: 'WHAT TO PLAN FOR', hidden: true },
    { label: 'WHERE TO STAY', href: '/where-to-stay' },
    { label: 'THE AREA', onClick: openMap },
  ];

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
          <div className="flex flex-col md:flex-row gap-4">
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

          {/* Map drawer — inherits width from parent wrapper */}
          <div className={`map-drawer${isMapOpen ? ' open' : ''}`}>
          <div style={{ borderRadius: '6px', overflow: 'hidden', height: '100%', position: 'relative' }}>
            <div ref={mapContainer} className="w-full h-full" />
            <button
              onClick={() => setIsMapOpen(false)}
              className="absolute top-2 right-2 z-10 font-ui text-white/70 hover:text-white text-sm leading-none transition-colors"
              style={{
                background: 'rgba(0,0,0,0.45)',
                borderRadius: '4px',
                width: '28px',
                height: '28px',
              }}
              aria-label="Close map"
            >
              ✕
            </button>
          </div>
        </div>
        </div>
      </section>

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
                  <label className="font-ui block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Attendance</label>
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
