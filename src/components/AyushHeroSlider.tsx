import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Calendar, MapPin, Sparkles, ShieldCheck, Award, HeartHandshake } from 'lucide-react';

import ayurvedicPhoto1 from '../assets/images/ayurvedic_photo_1.jpg';
import ayurvedicPhoto2 from '../assets/images/ayurvedic_photo_2.jpg';
import ayurvedicPhoto3 from '../assets/images/ayurvedic_photo_3.jpg';

interface SlideData {
  id: string;
  theme: 'green' | 'blue' | 'deeptech';
  badge: string;
  title: string;
  subtitle: string;
  tagline?: string;
  image: string;
  imageAlt: string;
  date?: string;
  location?: string;
  features?: Array<{ icon: string; text: string }>;
  actionLabel?: string;
}

const SLIDES: SlideData[] = [
  {
    id: 'slide-ayurveda-day',
    theme: 'green',
    badge: '#AyurvedaDay2026 • 23rd September, 2026',
    title: '11th Ayurveda Day: Ayurveda for a Healthier Tomorrow',
    subtitle: 'One Health, One Future: Integrating Ayurveda Science through Evidence, Innovation, and Holistic Care',
    image: ayurvedicPhoto1,
    imageAlt: 'Authentic Ayurvedic herbs, mortar and pestle, golden oils, tamarind and botanicals on tropical leaves',
    features: [
      { icon: 'HeartHandshake', text: 'Integrative Healthcare for Better Health Outcomes' },
      { icon: 'Sparkles', text: 'Evidence, Research and Innovation in Ayurveda' },
      { icon: 'Award', text: 'Ayurveda for Community Wellbeing and Sustainable Living' },
    ],
    actionLabel: 'View Statutory Guidelines',
  },
  {
    id: 'slide-transformative-decade',
    theme: 'blue',
    badge: 'Ministry of Ayush • Government of India',
    title: 'A DECADE OF TRANSFORMATIVE GROWTH IN AYUSH',
    subtitle: 'TOWARDS HOLISTIC HEALTH FOR ALL (2014–2024)',
    tagline: 'Standardizing Indian Systems of Medicine with Evidence-Based Research, TKDL Digital Protection, and Global Patent Harmonization.',
    image: ayurvedicPhoto3,
    imageAlt: 'Ayurvedic roots, fresh aloe vera, medicinal powders and apothecary bowls',
    features: [
      { icon: 'Award', text: '4.5 Lakh+ Classical Formulations in TKDL' },
      { icon: 'ShieldCheck', text: 'Section 3(p) Anti-Biopiracy Safeguards' },
      { icon: 'Sparkles', text: 'NABL & Pharmacopoeial Standard Testing' },
    ],
    actionLabel: 'Explore Transformation Milestones',
  },
  {
    id: 'slide-bharat-innovates',
    theme: 'deeptech',
    badge: 'DeepTech Innovation Initiative • Govt. of India',
    title: 'bharat INNOVATES',
    subtitle: 'Showcasing India’s AI, Botanical Biotechnology, and Traditional Medicine Innovations on the World Stage',
    image: ayurvedicPhoto2,
    imageAlt: 'Traditional spices, cardamom in terracotta pot, cinnamon sticks, ginger, and Ayurvedic botanicals',
    date: '14–16th June 2026',
    location: 'Palais des Expositions, Nice, France',
    features: [
      { icon: 'ShieldCheck', text: 'Dual-Regime Indian & USPTO Patent Strategy' },
      { icon: 'Award', text: 'Novel Extraction & NDDS Phytosome Formulations' },
      { icon: 'Sparkles', text: 'NBA Form 3 Benefit-Sharing Commercialization' },
    ],
    actionLabel: 'Access International Patent Navigator',
  },
];

interface AyushHeroSliderProps {
  onSelectAction?: (slideId: string) => void;
  language?: 'en' | 'hi';
}

export const AyushHeroSlider: React.FC<AyushHeroSliderProps> = ({ onSelectAction, language = 'en' }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-play timer (slides automatically every 5.5s)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const slide = SLIDES[currentSlide];

  return (
    <div
      id="ayush-official-hero-slider"
      className="relative w-full overflow-hidden rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 select-none group"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      {/* SLIDE: 11th Ayurveda Day (Rich Emerald Green Theme with Ayurvedic Herbs Flatlay Photo) */}
      {slide.theme === 'green' && (
        <div className="relative min-h-[380px] sm:min-h-[440px] bg-gradient-to-r from-emerald-950 via-teal-950/95 to-slate-950 text-white flex flex-col lg:flex-row items-center justify-between px-6 sm:px-12 py-10 overflow-hidden gap-8">
          {/* Subtle background photo overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay">
            <img
              src={slide.image}
              alt={slide.imageAlt}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Left Text Content */}
          <div className="relative z-10 max-w-xl lg:max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-xs font-bold mb-4 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {slide.badge}
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2 leading-tight drop-shadow-sm">
              {slide.title}
            </h2>
            <p className="text-xs sm:text-base text-emerald-100 mb-6 font-medium leading-relaxed drop-shadow-xs">
              {slide.subtitle}
            </p>

            {/* 3 Circular Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {slide.features?.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-400/30 backdrop-blur-md shadow-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-700 border border-emerald-400/40 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
                    {i + 1}
                  </div>
                  <span className="text-xs text-slate-100 font-medium leading-snug">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Hero Image Card (Photo is fully visible & prominent) */}
          <div className="relative z-10 flex-shrink-0 w-full lg:w-96">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-400/40 group-hover:scale-[1.02] transition-transform duration-500">
              <img
                src={slide.image}
                alt={slide.imageAlt}
                className="w-full h-56 sm:h-64 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                <span className="text-xs font-medium text-emerald-200 backdrop-blur-xs px-2.5 py-1 rounded-md bg-black/40 border border-white/10">
                  {slide.imageAlt}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE: A Decade of Transformative Growth (Blue / Indigo Theme with Roots & Apothecary Photo) */}
      {slide.theme === 'blue' && (
        <div className="relative min-h-[380px] sm:min-h-[440px] bg-gradient-to-r from-sky-950 via-blue-950/95 to-indigo-950 text-white flex flex-col lg:flex-row items-center justify-between px-6 sm:px-12 py-10 overflow-hidden gap-8">
          {/* Subtle background photo overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-luminosity">
            <img
              src={slide.image}
              alt={slide.imageAlt}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="relative z-10 max-w-xl lg:max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-200 text-xs font-semibold mb-4 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              {slide.badge}
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight drop-shadow-sm">
              {slide.title}
            </h2>
            <h3 className="text-sm sm:text-lg font-medium text-sky-200 mb-3 tracking-wide">
              {slide.subtitle}
            </h3>

            <p className="text-xs sm:text-sm text-slate-200 mb-6 leading-relaxed">
              {slide.tagline}
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
              {slide.features?.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-950/80 backdrop-blur-md border border-sky-400/30 text-xs text-slate-100">
                  <span className="text-sky-300">✓</span>
                  <span className="truncate">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="relative z-10 flex-shrink-0 w-full lg:w-96">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-sky-400/40 group-hover:scale-[1.02] transition-transform duration-500">
              <img
                src={slide.image}
                alt={slide.imageAlt}
                className="w-full h-56 sm:h-64 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                <span className="text-xs font-medium text-sky-200 backdrop-blur-xs px-2.5 py-1 rounded-md bg-black/40 border border-white/10">
                  {slide.imageAlt}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE: bharat INNOVATES (DeepTech Indigo Theme with Spices & Botanicals Photo) */}
      {slide.theme === 'deeptech' && (
        <div className="relative min-h-[380px] sm:min-h-[440px] bg-gradient-to-r from-slate-950 via-indigo-950/95 to-slate-950 text-white flex flex-col lg:flex-row items-center justify-between px-6 sm:px-12 py-10 overflow-hidden gap-8">
          {/* Subtle background photo overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay">
            <img
              src={slide.image}
              alt={slide.imageAlt}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="relative z-10 max-w-xl lg:max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              {slide.badge}
            </div>

            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">Initiative</span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-mono">
                bharat <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">INNOVATES</span>
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-indigo-200 mb-6 max-w-xl leading-relaxed">
              {slide.subtitle}
            </p>

            {/* Date & Location Pill Container */}
            <div className="inline-flex flex-wrap items-center gap-6 p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 backdrop-blur-md mb-4">
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-[10px] uppercase text-indigo-300 font-bold">DATE</div>
                  <div className="font-semibold">{slide.date}</div>
                </div>
              </div>
              <div className="h-6 w-px bg-white/20 hidden sm:block" />
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <MapPin className="w-4 h-4 text-teal-400" />
                <div>
                  <div className="text-[10px] uppercase text-teal-300 font-bold">LOCATION</div>
                  <div className="font-semibold">{slide.location}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="relative z-10 flex-shrink-0 w-full lg:w-96">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-indigo-400/40 group-hover:scale-[1.02] transition-transform duration-500">
              <img
                src={slide.image}
                alt={slide.imageAlt}
                className="w-full h-56 sm:h-64 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                <span className="text-xs font-medium text-indigo-200 backdrop-blur-xs px-2.5 py-1 rounded-md bg-black/40 border border-white/10">
                  {slide.imageAlt}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Arrows (Prev / Next) */}
      <button
        id="slider-prev-btn"
        onClick={prevSlide}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm border border-white/20 transition-all opacity-80 group-hover:opacity-100"
        title="Previous Slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        id="slider-next-btn"
        onClick={nextSlide}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm border border-white/20 transition-all opacity-80 group-hover:opacity-100"
        title="Next Slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Bottom Controls Bar: Dots & Pause/Play (Matching the exact blue segmented dots & play/pause icon in Capture 1.JPG & Capture.JPG) */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20">
        {/* Play / Pause Toggle */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-white/80 hover:text-white transition-colors"
          title={isPlaying ? 'Pause Autoplay' : 'Resume Autoplay'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Segmented Dots */}
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 transition-all rounded-full ${
                idx === currentSlide
                  ? 'w-6 bg-emerald-400 shadow-xs'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
