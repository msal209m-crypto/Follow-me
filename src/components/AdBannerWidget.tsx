import React, { useState, useEffect, useRef } from 'react';
import { 
  Megaphone, 
  Sparkles, 
  ExternalLink, 
  PartyPopper, 
  Flame, 
  ShoppingBag, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  Volume2,
  VolumeX,
  Store
} from 'lucide-react';
import { AdRecord } from '../types';
import { getAds } from '../services/adsService';

interface AdBannerWidgetProps {
  currentVillage?: string;
  isDarkMode?: boolean;
  isRTL?: boolean;
  onAdClick?: (ad: AdRecord) => void;
}

// Helper to normalize village names (strip prefixes like "قرية" or "حي" and whitespace)
const normalizeVillageName = (v?: string) => {
  if (!v) return '';
  return v
    .replace(/^(قرية|حي|منطقة)\s+/gi, '')
    .trim()
    .toLowerCase();
};

const isVillageMatching = (targetVillage?: string, adVillage?: string) => {
  // If targetVillage is not set or is 'ALL', show all ads!
  if (!targetVillage || targetVillage === 'ALL') return true;
  // If ad target is 'ALL' or empty, it applies to all villages!
  if (!adVillage || adVillage === 'ALL') return true;

  const normTarget = normalizeVillageName(targetVillage);
  const normAd = normalizeVillageName(adVillage);

  return (
    normTarget === normAd ||
    normTarget.includes(normAd) ||
    normAd.includes(normTarget)
  );
};

export const AdBannerWidget: React.FC<AdBannerWidgetProps> = ({
  currentVillage = '',
  isDarkMode = true,
  isRTL = true,
  onAdClick
}) => {
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load and filter ads for this village
  useEffect(() => {
    const loadAndFilterAds = () => {
      const allAds = getAds();
      const today = new Date().toISOString().split('T')[0];

      // 1. Get approved and active ads
      const approvedAds = allAds.filter((ad) => {
        // Auto treat ads without explicit status or APPROVED as valid
        const isApproved = ad.status === 'APPROVED' || !ad.status;
        if (!isApproved) return false;

        // Check expiration only if endDate is explicitly set
        if (ad.endDate && ad.endDate < today) return false;

        return true;
      });

      // 2. Filter by village
      let matchedAds = approvedAds.filter((ad) => isVillageMatching(currentVillage, ad.village));

      // 3. If no ads matched for this specific village, fallback to all approved ads so the banner is never empty
      if (matchedAds.length === 0 && approvedAds.length > 0) {
        matchedAds = approvedAds;
      }

      setAds(matchedAds);
      setCurrentIndex(0);
    };

    loadAndFilterAds();
    window.addEventListener('qaryati:ads-updated', loadAndFilterAds);
    return () => {
      window.removeEventListener('qaryati:ads-updated', loadAndFilterAds);
    };
  }, [currentVillage]);

  // Rotator logic with auto-advance every 7 seconds
  useEffect(() => {
    if (ads.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [ads.length, isPaused]);

  // Confetti Canvas Particle System (Smooth & Light)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 160);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const colors = [
      '#F59E0B', // Amber Gold
      '#10B981', // Emerald
      '#EF4444', // Crimson
      '#06B6D4', // Cyan
      '#EC4899', // Pink
      '#8B5CF6', // Purple
      '#FBBF24', // Yellow
      '#FFFFFF'  // White Sparkle
    ];

    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
      shape: 'rect' | 'circle' | 'ribbon';
      opacity: number;
    }

    const particleCount = 28;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 1.2,
        speedY: Math.random() * 0.9 + 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        shape: Math.random() > 0.4 ? 'rect' : Math.random() > 0.5 ? 'circle' : 'ribbon',
        opacity: Math.random() * 0.6 + 0.4
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Ribbon
          ctx.fillRect(-p.size, -p.size / 4, p.size * 1.6, p.size / 3);
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentIndex, ads.length]);

  if (ads.length === 0) return null;

  const currentAd = ads[currentIndex];
  const isCelebration = currentAd.theme === 'CELEBRATION' || currentAd.isConfettiEnabled !== false || currentAd.title.includes('افتتاح');
  const isHotDeal = currentAd.theme === 'HOT_DEAL' || currentAd.title.includes('عرض') || currentAd.title.includes('خصم');

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="w-full relative overflow-hidden rounded-3xl border transition-all duration-500 shadow-2xl group my-2 select-none"
      style={{
        background: isCelebration
          ? 'radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.25), transparent 60%), radial-gradient(ellipse at bottom left, rgba(245, 158, 11, 0.25), transparent 60%), #020617'
          : isHotDeal
          ? 'radial-gradient(ellipse at top right, rgba(239, 68, 68, 0.25), transparent 60%), radial-gradient(ellipse at bottom left, rgba(245, 158, 11, 0.25), transparent 60%), #020617'
          : 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
        borderColor: isCelebration
          ? 'rgba(245, 158, 11, 0.45)'
          : isHotDeal
          ? 'rgba(239, 68, 68, 0.45)'
          : 'rgba(51, 65, 85, 0.8)'
      }}
    >
      {/* 1. Interactive Confetti Canvas Layer */}
      {isCelebration && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-0 w-full h-full opacity-80"
        />
      )}

      {/* 2. Shimmer Light Sweep Animation (شعاع البريق الذهبي) */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 opacity-30 bg-gradient-to-r from-transparent via-amber-300/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"
        style={{
          animation: 'shimmerSweep 4s infinite linear'
        }}
      />

      {/* Custom Keyframe CSS */}
      <style>{`
        @keyframes shimmerSweep {
          0% { transform: translateX(-150%) rotate(15deg); }
          50% { transform: translateX(150%) rotate(15deg); }
          100% { transform: translateX(150%) rotate(15deg); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6)); }
          50% { opacity: 1; filter: drop-shadow(0 0 16px rgba(245, 158, 11, 0.9)); }
        }
      `}</style>

      {/* 3. Main Content Container */}
      <div className="relative z-20 p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Right Section: Media & Text (in RTL) */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4 text-center sm:text-right flex-1 min-w-0">
          
          {/* Ad Image / Visual Icon */}
          <div className="relative shrink-0">
            {currentAd.imageUrl ? (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-xl shadow-amber-950/40 group-hover:scale-105 transition-transform duration-300">
                <img
                  src={currentAd.imageUrl}
                  alt={currentAd.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <span className="absolute bottom-1 right-1 text-[9px] font-black text-amber-300 bg-slate-950/90 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                  {currentAd.village || 'القرية'}
                </span>
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-amber-600 via-emerald-600 to-teal-500 flex items-center justify-center text-white text-3xl shadow-xl border border-amber-400/40">
                🎉
              </div>
            )}

            {/* Floating Celebration Popper Badge */}
            <div 
              className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center shadow-lg border-2 border-slate-950 text-xs font-black animate-bounce"
              title="خبر وافتتاح رسمي"
            >
              {isCelebration ? <PartyPopper className="w-3.5 h-3.5" /> : isHotDeal ? <Flame className="w-3.5 h-3.5 text-red-600" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Text Details */}
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Badges Row */}
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              {/* Event Badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-md ${
                isCelebration
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : isHotDeal
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
              }`}>
                {isCelebration ? (
                  <>
                    <PartyPopper className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>{currentAd.badgeText || 'افتتاح مبارك واحتفال 🎉'}</span>
                  </>
                ) : isHotDeal ? (
                  <>
                    <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    <span>{currentAd.badgeText || 'عرض وتخفيضات نارية 🔥'}</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{currentAd.badgeText || 'إعلان ترويجي رسمي 📢'}</span>
                  </>
                )}
              </span>

              {/* Village & Store pill */}
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 bg-slate-900/80 px-2.5 py-0.5 rounded-lg border border-slate-800">
                <Store className="w-3 h-3 text-emerald-400" />
                <span>{currentAd.storeName}</span>
                {currentAd.village && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400 font-medium">قرية {currentAd.village}</span>
                  </>
                )}
              </span>
            </div>

            {/* Title with Glow */}
            <h3 className="text-sm sm:text-base font-black text-white leading-snug tracking-tight">
              {currentAd.title}
            </h3>

            {/* Description */}
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed max-w-2xl">
              {currentAd.description}
            </p>
          </div>
        </div>

        {/* Left Section: Action Button & Carousel Controls */}
        <div className="flex flex-row md:flex-col items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          
          {/* Main Action Button */}
          <button
            type="button"
            onClick={() => {
              if (onAdClick) {
                onAdClick(currentAd);
              } else if (currentAd.linkUrl) {
                window.open(currentAd.linkUrl, '_blank');
              }
            }}
            className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-xl active:scale-95 ${
              isCelebration
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 border border-yellow-300 shadow-amber-500/25'
                : isHotDeal
                ? 'bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white border border-rose-400/40 shadow-rose-950/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-emerald-950/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{currentAd.actionText || 'زيارة المتجر والتسوق 🛒'}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          {/* Carousel Navigator (if > 1 ad) */}
          {ads.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="الإعلان السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-1">
                {ads.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === currentIndex
                        ? 'w-5 bg-amber-400 shadow-sm shadow-amber-400'
                        : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="الإعلان التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
