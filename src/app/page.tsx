'use client'
import React, { useState, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Set your token safely from your environment variable
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  // Wynwood, Miami Coordinates (Adjust these to your exact venue coordinates later)
  const [lng] = useState(-80.1993);
  const [lat] = useState(25.8026);
  const [zoom] = useState(14);

  // Form State
  const [isRSVPing, setIsRSVPing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    attending: 'Enthusiastically Yes',
    plusOne: 'No',
    plusOneName: '',
    dietaryRestrictions: 'No',
    dietDetail: ''
  })

  // Native Mapbox Initialization
  useEffect(() => {
    if (map.current || !mapContainer.current) return; // Initialize map only once
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    });

    // Add a beautiful default pin marker at your venue location
    new mapboxgl.Marker({ color: '#ef4444' }) // Tailwind Red 500
      .setLngLat([lng, lat])
      .addTo(map.current);

    // Clean up map resources on component unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [lng, lat, zoom]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus('idle')

    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setStatus('success')
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          attending: 'Enthusiastically Yes',
          plusOne: 'No',
          plusOneName: '',
          dietaryRestrictions: 'No',
          dietDetail: ''
        })
      } else {
        setStatus('error')
      }
    } catch (error) {
      console.error(error)
      setStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-pink-100">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex flex-col items-center justify-center text-center bg-gradient-to-b from-indigo-900 to-slate-900 text-white px-4">
        <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center mix-blend-overlay opacity-30"></div>
        <div className="relative z-10 max-w-3xl">
          <span className="text-pink-400 font-semibold tracking-widest text-sm uppercase block mb-3">You Are Invited</span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">Castlewave Celebration</h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-xl mx-auto">Join us for an unforgettable gathering of friends, food, and music in the heart of the city.</p>
        </div>
      </section>

      {/* Main Content Split */}
      <section className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        
        {/* Left Side: Details & Map */}
        <div className="space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 border-b pb-2 border-slate-100">Event Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">When</h3>
                  <p className="text-slate-600">Saturday, November 14, 2026</p>
                  <p className="text-slate-500 text-sm">6:00 PM - 11:00 PM EST</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Where</h3>
                  <p className="text-slate-600">The Wynwood Factory Container</p>
                  <p className="text-slate-500 text-sm">Wynwood, Miami, FL</p>
                </div>
              </div>
            </div>

            {/* The Bulletproof Native Map Box Container */}
            <div className="w-full h-[350px] rounded-xl overflow-hidden shadow-inner border border-slate-200 mt-6 relative bg-slate-100">
              <div ref={mapContainer} className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Right Side: Interactive RSVP Form */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 sticky top-6">
          <h2 className="text-2xl font-bold mb-2 text-slate-800">Are You Coming?</h2>
          <p className="text-slate-500 text-sm mb-6">Kindly respond by October 1st to ensure your spot.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">First Name</label>
                <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Last Name</label>
                <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
              <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Attendance</label>
              <select name="attending" value={formData.attending} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition">
                <option value="Enthusiastically Yes">Enthusiastically Yes!</option>
                <option value="Regretfully No">Regretfully No</option>
              </select>
            </div>

            {formData.attending !== 'Regretfully No' && (
              <>
                <div className="grid grid-cols-3 gap-4 items-end">
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Plus One?</label>
                    <select name="plusOne" value={formData.plusOne} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition">
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  {formData.plusOne === 'Yes' && (
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Guest's Full Name</label>
                      <input required type="text" name="plusOneName" value={formData.plusOneName} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Dietary Restrictions?</label>
                  <select name="dietaryRestrictions" value={formData.dietaryRestrictions} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition mb-3">
                    <option value="No">No Restrictions</option>
                    <option value="Yes">Yes, I have restrictions</option>
                  </select>
                  {formData.dietaryRestrictions === 'Yes' && (
                    <textarea name="dietDetail" value={formData.dietDetail} onChange={handleChange} placeholder="e.g., Vegan, Gluten-Free, Peanut Allergy..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition h-20 resize-none" />
                  )}
                </div>
              </>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium p-4 rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2">
              {isSubmitting ? 'Submitting...' : 'Confirm RSVP'}
            </button>

            {status === 'success' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm text-center font-medium animate-fade-in">
                🎉 Awesome! Your RSVP has been saved successfully.
              </div>
            )}
            {status === 'error' && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm text-center font-medium">
                ❌ Something went wrong. Please check your connection and try again.
              </div>
            )}
          </form>
        </div>

      </section>
    </main>
  )
}