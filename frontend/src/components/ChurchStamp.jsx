import React, { useId } from 'react';
import { toEthiopian } from '../utils/ethiopianCalendar';
import { formatDual } from '../utils/dateFormat';
import logoWaldaImg from '../assets/logo-walda.png';

/**
 * ChurchStamp - Authentic circular church seal/stamp
 * Used on receipts, official letters, certificates, and ID cards.
 *
 * @param {number} size - Size in pixels (default 100)
 * @param {string|Date} date - Date string or Date object
 * @param {string} className - Optional Tailwind classes (e.g. "-rotate-6")
 */
const ChurchStamp = ({
  size = 100,
  date = null,
  className = '-rotate-6',
  colorClass = 'text-royal print:text-black'
}) => {
  const uniqueId = useId().replace(/:/g, '');

  // Format date: Show Ethiopian date on the seal face, dual date in tooltip
  const formattedDate = React.useMemo(() => {
    try {
      let d;
      if (!date) {
        d = new Date();
      } else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [y, m, day] = date.split('-').map(Number);
        d = new Date(Date.UTC(y, m - 1, day));
      } else {
        d = new Date(date);
      }
      if (isNaN(d.getTime())) return String(date || '');
      const eth = toEthiopian(d);
      return `${String(eth.day).padStart(2, '0')}/${String(eth.month).padStart(2, '0')}/${eth.year} E.C.`;
    } catch {
      return String(date || '');
    }
  }, [date]);

  const sealTitle = React.useMemo(() => {
    try {
      return `Official Church Seal - ${formatDual(date || new Date())}`;
    } catch {
      return 'Official Church Seal';
    }
  }, [date]);

  const topPathId = `top-arc-${uniqueId}`;
  const bottomPathId = `bottom-arc-${uniqueId}`;
  const logoClipId = `logo-clip-${uniqueId}`;

  return (
    <div
      className={`church-stamp inline-block select-none transition-transform ${className}`}
      style={{ width: size, height: size }}
      title={sealTitle}
    >
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className={`w-full h-full ${colorClass}`}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
      >
        <defs>
          {/* Top Arc Path (Clockwise from 9 to 3 o'clock) */}
          <path
            id={topPathId}
            d="M 22,100 A 78,78 0 0,1 178,100"
            fill="none"
          />
          {/* Bottom Arc Path (Clockwise from 9 to 3 o'clock across bottom, flipped for upright text) */}
          <path
            id={bottomPathId}
            d="M 24,102 A 76,76 0 0,0 176,102"
            fill="none"
          />
          {/* Circular Clip for Official Church Logo */}
          <clipPath id={logoClipId}>
            <circle cx="0" cy="-22" r="20" />
          </clipPath>
        </defs>

        {/* Outer Serrated / Dotted Accent Ring */}
        <circle
          cx="100"
          cy="100"
          r="97"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          opacity="0.85"
        />

        {/* Outer Heavy Circular Ring */}
        <circle
          cx="100"
          cy="100"
          r="93"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
        />

        {/* Inner Border Ring */}
        <circle
          cx="100"
          cy="100"
          r="66"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />

        {/* Innermost Ring */}
        <circle
          cx="100"
          cy="100"
          r="63"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 1.5"
        />

        {/* Top Text along arc */}
        <text
          fill="currentColor"
          fontSize="12"
          fontWeight="1000"
          letterSpacing="0.9"
          style={{ textTransform: 'uppercase' }}
        >
          <textPath
            href={`#${topPathId}`}
            startOffset="50%"
            textAnchor="middle"
          >
            W.Q.G WALDAA QULQULLUU GIYOORGISII
          </textPath>
        </text>

        {/* Bottom Text along arc */}
        <text
          fill="currentColor"
          fontSize="10"
          fontWeight="900"
          letterSpacing="0.6"
          style={{ textTransform: 'uppercase' }}
        >
          <textPath
            href={`#${bottomPathId}`}
            startOffset="50%"
            textAnchor="middle"
          >
            ★ የቅዱስ ጊዮርጊስ ማኅበር ★
          </textPath>
        </text>

        {/* Center Content: Official Church Logo & Seal Details */}
        <g transform="translate(100, 100)">
          {/* Official Church Logo inside stamp center */}
          <g>
            {/* Clean white circular backing so logo is crisp across any background */}
            <circle
              cx="0"
              cy="-22"
              r="20.5"
              fill="#FFFFFF"
            />
            {/* Centered and scaled circular church logo */}
            <image
              href={logoWaldaImg || '/logo-walda.png'}
              xlinkHref={logoWaldaImg || '/logo-walda.png'}
              x="-20"
              y="-42"
              width="40"
              height="40"
              preserveAspectRatio="xMidYMid meet"
              clipPath={`url(#${logoClipId})`}
            />
            {/* Enclosing stamp-ink circle */}
            <circle
              cx="0"
              cy="-22"
              r="20.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.85"
            />
          </g>

          {/* VERIFIED Banner Box */}
          <rect
            x="-38"
            y="2"
            width="76"
            height="15"
            rx="2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <text
            x="0"
            y="13"
            textAnchor="middle"
            fill="currentColor"
            fontSize="8"
            fontWeight="900"
            letterSpacing="1.2"
          >
            VERIFIED
          </text>

          {/* Date Label */}
          <text
            x="0"
            y="26"
            textAnchor="middle"
            fill="currentColor"
            fontSize="7.5"
            fontWeight="800"
            fontFamily="monospace"
          >
            {formattedDate}
          </text>

          {/* Subtext */}
          <text
            x="0"
            y="35"
            textAnchor="middle"
            fill="currentColor"
            fontSize="5.5"
            fontWeight="700"
            letterSpacing="0.4"
          >
            SEERA-QABEESSA
          </text>
        </g>
      </svg>
    </div>
  );
};

export default ChurchStamp;
