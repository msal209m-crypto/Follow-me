import React from 'react';

interface CoffeeTreeLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  textClassName?: string;
  subTextClassName?: string;
}

/**
 * شعار شجرة البن الخولاني (Coffee Tree Logo)
 * أيقونة وشعار فلات مبسط (Flat / Minimalist) يعبر عن هوية منصة "قريتي"
 * وثراء البن والتراث الأصيل، بألوان متناسقة (أخضر زمردي داكن، بني ترابي، وأحمر كرزي للثمار)
 */
export const CoffeeTreeLogo: React.FC<CoffeeTreeLogoProps> = ({
  className = '',
  size = 36,
  showText = false,
  textClassName = 'text-white font-black text-base',
  subTextClassName = 'text-[10px] text-amber-300 font-medium',
}) => {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* SVG Icon: شجرة البن بتصميم فلات عصري متناسق */}
      <div
        style={{ width: dimension, height: dimension }}
        className="shrink-0 relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-amber-950/60 p-1.5 border border-emerald-500/40 shadow-md shadow-emerald-950/30 group"
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
        >
          {/* Subtle warm glow background behind the tree crown */}
          <circle cx="50" cy="46" r="38" fill="url(#coffeeGlow)" opacity="0.4" />

          {/* Minimalist Soil & Base Ground Mound */}
          <ellipse cx="50" cy="88" rx="28" ry="4.5" fill="#78350F" opacity="0.7" />
          <ellipse cx="50" cy="87" rx="20" ry="3" fill="#92400E" />

          {/* Tree Trunk (جذع شجرة البن البني الترابي الدافئ) */}
          <path
            d="M48 88C48 88 47 70 45 56C44 48 42 42 38 36M52 88C52 88 53 70 55 56C56 48 58 42 62 36"
            stroke="#A16207"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M50 88L50 40M50 58L36 48M50 50L64 42M50 68L34 60M50 64L66 56"
            stroke="#78350F"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Coffee Tree Foliage & Leaves (أوراق شجرة البن الخولاني الخضراء الزمردية) */}
          {/* Central Top Canopy Leaves */}
          <path
            d="M50 14C45 22 47 34 50 38C53 34 55 22 50 14Z"
            fill="#10B981"
            stroke="#065F46"
            strokeWidth="1.5"
          />
          {/* Left Upper Leaves */}
          <path
            d="M36 24C30 30 34 40 40 42C41 37 41 29 36 24Z"
            fill="#059669"
            stroke="#047857"
            strokeWidth="1.5"
          />
          {/* Right Upper Leaves */}
          <path
            d="M64 24C70 30 66 40 60 42C59 37 59 29 64 24Z"
            fill="#059669"
            stroke="#047857"
            strokeWidth="1.5"
          />

          {/* Middle Tier Leaves */}
          <path
            d="M24 38C18 45 22 56 30 56C32 50 31 43 24 38Z"
            fill="#10B981"
            stroke="#065F46"
            strokeWidth="1.5"
          />
          <path
            d="M76 38C82 45 78 56 70 56C68 50 69 43 76 38Z"
            fill="#10B981"
            stroke="#065F46"
            strokeWidth="1.5"
          />

          {/* Lower Branches Foliage */}
          <path
            d="M22 54C16 60 20 70 28 70C30 65 29 58 22 54Z"
            fill="#047857"
            stroke="#064E3B"
            strokeWidth="1.5"
          />
          <path
            d="M78 54C84 60 80 70 72 70C70 65 71 58 78 54Z"
            fill="#047857"
            stroke="#064E3B"
            strokeWidth="1.5"
          />

          {/* Center Crown Leaves Layer */}
          <path
            d="M42 32C36 38 40 46 48 46C48 40 47 35 42 32Z"
            fill="#34D399"
          />
          <path
            d="M58 32C64 38 60 46 52 46C52 40 53 35 58 32Z"
            fill="#34D399"
          />

          {/* Ripe Coffee Cherries / Berries (ثمار البن الأحمر والياقوتي الناضجة) */}
          {/* Cluster 1 - Upper center */}
          <circle cx="48" cy="39" r="3.2" fill="#DC2626" />
          <circle cx="52" cy="38" r="2.8" fill="#EF4444" />
          <circle cx="50" cy="42" r="3" fill="#B91C1C" />
          <circle cx="47" cy="38" r="0.9" fill="#FCA5A5" />

          {/* Cluster 2 - Left branch */}
          <circle cx="34" cy="50" r="3" fill="#DC2626" />
          <circle cx="38" cy="49" r="2.6" fill="#EF4444" />
          <circle cx="36" cy="53" r="2.8" fill="#991B1B" />
          <circle cx="33" cy="49" r="0.8" fill="#FCA5A5" />

          {/* Cluster 3 - Right branch */}
          <circle cx="66" cy="50" r="3" fill="#DC2626" />
          <circle cx="62" cy="49" r="2.6" fill="#EF4444" />
          <circle cx="64" cy="53" r="2.8" fill="#991B1B" />
          <circle cx="67" cy="49" r="0.8" fill="#FCA5A5" />

          {/* Cluster 4 - Lower tier cherries */}
          <circle cx="32" cy="62" r="2.8" fill="#DC2626" />
          <circle cx="68" cy="62" r="2.8" fill="#DC2626" />

          {/* Subtle Golden Gradients */}
          <defs>
            <radialGradient id="coffeeGlow" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#D97706" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Name & Tagline (اختياري) */}
      {showText && (
        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={textClassName}>قريتي</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              الرقمية
            </span>
          </div>
          <span className={subTextClassName}>منصة القرى والمتاجر الموحدة</span>
        </div>
      )}
    </div>
  );
};

export default CoffeeTreeLogo;
