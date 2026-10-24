import React from 'react';

interface GaugeProps {
  value: number;
  color: string;
}

export const Gauge: React.FC<GaugeProps> = ({ value, color }) => {
  return (
    <svg viewBox="0 0 100 100" width="130" role="img" aria-label={`${value}%`}>
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="var(--bd)"
        strokeWidth="9"
      />
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${2.64 * value} 264`}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="55"
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        fill="var(--tx)"
      >
        {value}%
      </text>
    </svg>
  );
};
