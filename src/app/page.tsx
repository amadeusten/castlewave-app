'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const displayFont = { fontFamily: "'Miedinger', 'Georgia', serif" } as const;
const uiFont = { fontFamily: "'Open Sauce One', 'Arial Narrow', Arial, sans-serif" } as const;

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

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [lng] = useState(-80.1993);
  const [lat] = useState(25.8026);
  const [zoom] = useState(14);

  const [mapExpanded, setMapExpanded] = useState(false);
  const [isRSVPOpen, setIsRSVPOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom,
    });
    map.current.on('load', () => {
      ['poi-label', 'road-label', 'road-number-shield'].forEach(layer => {
        if (map.current?.getLayer(layer)) {
          map.current.setLayoutProperty(layer, 'visibility', 'none');
        }
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
  }, [lng, lat, zoom]);

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
        body: JSON.stringify(formData),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ctaButtons = [
    { label: 'WHAT TO PLAN FOR', onClick: undefined as (() => void) | undefined },
    { label: 'RSVP', onClick: openRSVP },
    { label: 'WHERE TO STAY', onClick: undefined as (() => void) | undefined },
  ];

  return (
    <main style={{ background: '#191b25' }} className="min-h-screen text-white">

      {/* Hero */}
      <section
        style={{ background: 'linear-gradient(to top, #191b25 27%, #131417 91%)' }}
        className="flex flex-col items-center justify-center text-center px-6 py-24 min-h-[60vh]"
      >
        <p style={displayFont} className="text-white font-bold text-xl md:text-2xl tracking-wide">
          Once upon a night in Miami
        </p>

        <img src="/CD_logo.svg" alt="Castlewave" className="w-[200px] md:w-[280px] mx-auto my-16" />

        <p style={displayFont} className="text-white text-xl md:text-2xl tracking-wide">
          August 15, 2026
        </p>
      </section>

      {/* CTA Buttons */}
      <section className="flex flex-col md:flex-row items-center justify-center gap-4 px-6 pt-10 pb-20">
        {ctaButtons.map(({ label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              ...uiFont,
              background: '#191b25',
              borderRadius: '6px',
              height: '75px',
              minWidth: '279px',
              letterSpacing: '1px',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            className="w-full md:w-auto text-white font-bold uppercase text-sm px-8 transition-opacity duration-150 hover:opacity-70 cursor-pointer"
          >
            {label}
          </button>
        ))}
      </section>

      {/* The Area */}
      <section className="px-6 pb-24 w-full max-w-[1375px] mx-auto">
        <h2
          style={displayFont}
          className="text-xl md:text-2xl font-bold text-white mb-6 tracking-wide text-center"
        >
          THE AREA
        </h2>
        <div
          className="mx-auto w-full"
          style={{
            maxWidth: mapExpanded ? '869px' : '435px',
            transition: 'max-width 0.35s ease',
          }}
        >
          <div
            style={{ borderRadius: '6px', overflow: 'hidden' }}
            className="relative w-full h-[400px] md:h-[480px]"
          >
            <div ref={mapContainer} className="w-full h-full" />
            {!mapExpanded && (
              <div
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={() => {
                  setMapExpanded(true);
                  setTimeout(() => map.current?.resize(), 370);
                }}
              />
            )}
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

            <h2 style={displayFont} className="text-2xl font-bold text-white mb-1">RSVP</h2>
            <p style={uiFont} className="text-white/50 text-sm mb-6">We look forward to seeing you!</p>

            {status === 'success' ? (
              <div className="text-center py-8">
                <p style={displayFont} className="text-white text-2xl mb-3">You&apos;re in.</p>
                <p style={uiFont} className="text-white/50 text-sm mb-8">We can&apos;t wait to see you.</p>
                <button
                  onClick={closeRSVP}
                  style={{ ...uiFont, background: 'rgba(255,255,255,0.08)', borderRadius: '6px', letterSpacing: '1px' }}
                  className="px-8 py-3 text-white text-xs font-bold uppercase hover:opacity-70 transition-opacity"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={uiFont} className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">First Name</label>
                    <input
                      required type="text" name="firstName"
                      value={formData.firstName} onChange={handleChange}
                      style={inputStyle}
                      className="w-full p-3 text-white text-sm focus:outline-none focus:border-white/40 transition placeholder:text-white/20"
                    />
                  </div>
                  <div>
                    <label style={uiFont} className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Last Name</label>
                    <input
                      required type="text" name="lastName"
                      value={formData.lastName} onChange={handleChange}
                      style={inputStyle}
                      className="w-full p-3 text-white text-sm focus:outline-none focus:border-white/40 transition placeholder:text-white/20"
                    />
                  </div>
                </div>

                <div>
                  <label style={uiFont} className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Email</label>
                  <input
                    required type="email" name="email"
                    value={formData.email} onChange={handleChange}
                    style={inputStyle}
                    className="w-full p-3 text-white text-sm focus:outline-none focus:border-white/40 transition placeholder:text-white/20"
                  />
                </div>

                <div>
                  <label style={uiFont} className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Attendance</label>
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
                        <label style={uiFont} className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Plus One?</label>
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
                          <label style={uiFont} className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Guest Name</label>
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
                      <label style={uiFont} className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Dietary Restrictions?</label>
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
                  <p style={uiFont} className="text-red-400 text-sm text-center">Something went wrong. Please try again.</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    ...uiFont,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    letterSpacing: '1px',
                  }}
                  className="w-full py-4 text-white font-bold uppercase text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
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
