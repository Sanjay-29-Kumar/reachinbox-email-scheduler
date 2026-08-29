import React from 'react';

interface OnbLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showGrid?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Pixel-perfect ONB logo component replicating the exact 8-bit / bitmap grid typography.
 */
export const OnbLogo: React.FC<OnbLogoProps> = ({
  size = 'md',
  showGrid = false,
  className = '',
  style = {},
}) => {
  // Base scale factors
  const dimensions = {
    sm: { width: 96, height: 44, scale: 3 },
    md: { width: 140, height: 64, scale: 4.5 },
    lg: { width: 220, height: 100, scale: 7 },
    xl: { width: 340, height: 156, scale: 11 },
  }[size];

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: showGrid ? '8px' : '0px',
        overflow: 'hidden',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 34 16"
        width={dimensions.width}
        height={dimensions.height}
        style={{
          display: 'block',
          shapeRendering: 'crispEdges',
          imageRendering: 'pixelated',
        }}
      >
        <defs>
          {showGrid && (
            <pattern id="onb-grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <rect width="1" height="1" fill="#FFFFFF" />
              <path
                d="M 1 0 L 0 0 0 1"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="0.08"
              />
            </pattern>
          )}
        </defs>

        {/* Background Grid Pattern (optional graph paper styling) */}
        {showGrid && <rect width="34" height="16" fill="url(#onb-grid)" />}

        {/* Pixel Art Paths (Y offset: 2 to 14) */}
        <g fill="#111827">
          {/* ================= LETTER 'O' (X: 1 to 9, Y: 2 to 14) ================= */}
          {/* Top cap */}
          <rect x="3" y="2" width="4" height="1" />
          <rect x="2" y="3" width="6" height="1" />
          {/* Left and Right vertical bars */}
          <rect x="1" y="4" width="2" height="8" />
          <rect x="7" y="4" width="2" height="8" />
          {/* Bottom cap */}
          <rect x="2" y="12" width="6" height="1" />
          <rect x="3" y="13" width="4" height="1" />

          {/* ================= LETTER 'N' (X: 12 to 20, Y: 2 to 14) ================= */}
          {/* Left Vertical Bar */}
          <rect x="12" y="2" width="2" height="12" />
          {/* Diagonal pixel steps */}
          <rect x="14" y="4" width="2" height="2" />
          <rect x="15" y="6" width="2" height="4" />
          <rect x="17" y="9" width="2" height="2" />
          {/* Right Vertical Bar */}
          <rect x="18" y="2" width="2" height="12" />

          {/* ================= LETTER 'B' (X: 23 to 32, Y: 2 to 14) ================= */}
          {/* Left Vertical Bar */}
          <rect x="23" y="2" width="2" height="12" />
          {/* Top loop cap */}
          <rect x="25" y="2" width="4" height="1" />
          <rect x="24" y="3" width="6" height="1" />
          {/* Top loop right side */}
          <rect x="28" y="4" width="2" height="2" />
          {/* Middle bar & protrusion */}
          <rect x="25" y="6" width="4" height="2" />
          <rect x="28" y="7" width="3" height="1" />
          {/* Bottom loop right side */}
          <rect x="28" y="8" width="2" height="4" />
          {/* Bottom loop cap */}
          <rect x="24" y="12" width="6" height="1" />
          <rect x="25" y="13" width="4" height="1" />
        </g>
      </svg>
    </div>
  );
};
