import React, { useState } from 'react';
import { Megaphone, ExternalLink, Pause, Play, FileText } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  titleHindi: string;
  link?: string;
  isNew?: boolean;
}

const AYUSH_NEWS_ITEMS: NewsItem[] = [
  {
    id: 'news-1',
    title: '11 Years of Transformation in Ayush — Towards Holistic Health for All (Official Report)',
    titleHindi: 'आयुष में परिवर्तन के 11 वर्ष — सबके लिए समग्र स्वास्थ्य (अधिकृत रिपोर्ट)',
    link: 'https://ayush.gov.in',
    isNew: true,
  },
  {
    id: 'news-2',
    title: 'NCISM website — www.ncismindia.org — Information Desk - Rules and Regulations section',
    titleHindi: 'एनसीआईएसएम पोर्टल — www.ncismindia.org — नियम एवं विनियम सूचना डेस्क',
    link: 'https://ncismindia.org',
  },
  {
    id: 'news-3',
    title: 'NCH website — www.nch.org.in — Rules and Regulations update for Homoeopathic research',
    titleHindi: 'एनसीएच पोर्टल — www.nch.org.in — होम्योपैथी अनुसंधान नियम एवं विनियम अपडेट',
    link: 'https://nch.org.in',
  },
  {
    id: 'news-4',
    title: 'Traditional Knowledge Digital Library (TKDL): Over 4.5 Lakh classical formulations protected from biopiracy',
    titleHindi: 'पारंपरिक ज्ञान डिजिटल लाइब्रेरी (TKDL): 4.5 लाख से अधिक शास्त्रीय योगों का जैव-चोरी से संरक्षण',
    link: 'https://tkdl.res.in',
    isNew: true,
  },
  {
    id: 'news-5',
    title: 'National Biodiversity Authority (NBA): Mandatory Form 3 prior approval for all foreign patent filings under Sec 6',
    titleHindi: 'राष्ट्रीय जैव विविधता प्राधिकरण (NBA): धारा 6 के तहत विदेशी पेटेंट आवेदनों हेतु फॉर्म 3 पूर्व अनुमति अनिवार्य',
    link: 'http://nbaindia.org',
  },
  {
    id: 'news-6',
    title: 'Ayurveda Day 2026: "One Health, One Future: Integrating Ayurveda Science through Evidence, Innovation, and Holistic care"',
    titleHindi: 'आयुर्वेद दिवस 2026: "एक स्वास्थ्य, एक भविष्य: साक्ष्य, नवाचार और समग्र देखभाल के माध्यम से आयुर्वेद का एकीकरण"',
    isNew: true,
  },
  {
    id: 'news-7',
    title: 'bharat INNOVATES — The DeepTech Innovation Initiative of the Ministry of Education & Ayush, Government of India',
    titleHindi: 'भारत इनोवेट्स — शिक्षा मंत्रालय एवं आयुष मंत्रालय, भारत सरकार की डीप-टेक नवाचार पहल',
  },
];

interface AyushNewsMarqueeProps {
  language?: 'en' | 'hi';
  inHeader?: boolean;
}

export const AyushNewsMarquee: React.FC<AyushNewsMarqueeProps> = ({ language = 'en', inHeader = false }) => {
  const [isPaused, setIsPaused] = useState(false);
  const isHindi = language === 'hi';

  return (
    <div
      id={inHeader ? 'ayush-news-marquee-header' : 'ayush-news-marquee-footer'}
      className={`bg-emerald-900 dark:bg-slate-900 text-white select-none overflow-hidden relative z-30 flex items-center shadow-xs ${
        inHeader
          ? 'border-t border-emerald-800/80 dark:border-slate-800 py-1.5 px-3 sm:px-6'
          : 'border-t border-emerald-800 dark:border-slate-800 py-2.5 px-3 sm:px-6 shadow-lg'
      }`}
    >
      {/* Announcements Badge (Matching 'घोषणाएँ 📢' in the user's uploaded images) */}
      <div className="flex-shrink-0 flex items-center gap-2 pr-3 sm:pr-4 border-r border-emerald-700/80 dark:border-slate-700 bg-emerald-950/80 dark:bg-emerald-950/90 py-0.5 sm:py-1 px-2.5 sm:px-3 rounded-lg mr-2 sm:mr-3 shadow-inner">
        <span className="font-extrabold text-[11px] sm:text-xs tracking-wider text-emerald-300 flex items-center gap-1.5 font-serif">
          {isHindi ? 'घोषणाएँ' : 'Announcements'}
          <Megaphone className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        </span>
      </div>

      {/* Scrolling Text Container */}
      <div
        className="flex-1 overflow-hidden relative cursor-pointer"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`flex items-center gap-10 whitespace-nowrap text-xs text-slate-100 ${
            isPaused ? '' : 'animate-marquee'
          }`}
          style={{ animationDuration: '42s' }}
        >
          {AYUSH_NEWS_ITEMS.concat(AYUSH_NEWS_ITEMS).map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="inline-flex items-center gap-2 group">
              {item.isNew && (
                <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-amber-500 text-slate-950 shadow-xs">
                  NEW
                </span>
              )}
              <span className="hover:text-emerald-300 transition-colors flex items-center gap-1">
                {isHindi ? item.titleHindi : item.title}
                {item.link && <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 inline" />}
              </span>
              <span className="text-emerald-500 font-bold mx-2">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Play/Pause Control (Matching the '||' toggle shown in user's image) */}
      <div className="flex-shrink-0 pl-3">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-1 rounded-md bg-emerald-800/80 hover:bg-emerald-700 dark:bg-slate-800 text-emerald-200 hover:text-white transition-colors"
          title={isPaused ? 'Resume scrolling' : 'Pause scrolling'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
      </div>

      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 45s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};
