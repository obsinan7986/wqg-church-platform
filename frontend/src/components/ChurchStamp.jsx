import React, { useId } from 'react';
import { toEthiopian } from '../utils/ethiopianCalendar';
import { formatDual } from '../utils/dateFormat';

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

        {/* Center Content: Ethiopian Orthodox Cross & Seal Details */}
        <g transform="translate(100, 100)">
          {/* Orthodox Cross Icon (stylized SVG paths) */}
          <g transform="translate(0, -22) scale(0.7)" stroke="currentColor" fill="currentColor">
            {/* Vertical Beam */}
            <rect x="-2.5" y="-18" width="5" height="34" rx="1" />
            {/* Main Cross Beam */}
            <rect x="-14" y="-8" width="28" height="5" rx="1" />
            {/* Top Bar */}
            <rect x="-7" y="-15" width="14" height="3" rx="0.5" />
            {/* Bottom Slanted/Decorative Bar */}
            <path d="M -9 8 L 9 4 L 9 6.5 L -9 10.5 Z" />
            {/* End Crosslets */}
            <circle cx="0" cy="-19" r="2" />
            <circle cx="-15" cy="-5.5" r="2" />
            <circle cx="15" cy="-5.5" r="2" />
            <circle cx="0" cy="17" r="2" />
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
