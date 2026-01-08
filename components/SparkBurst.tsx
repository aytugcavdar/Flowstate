
import React, { useMemo } from 'react';

// A visual component that renders an explosion of small particles
// Purely decorative (Juice!)
export const SparkBurst: React.FC = () => {
  // Generate random particles
  const particles = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 12;
      const distance = 40 + Math.random() * 20; // Distance to fly
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const delay = Math.random() * 0.1;
      const size = 2 + Math.random() * 3;
      // Random cyberpunk colors
      const color = Math.random() > 0.5 ? '#22d3ee' : '#facc15'; // Cyan or Yellow

      return { id: i, tx, ty, delay, size, color };
    });
  }, []);

  return (
    <div className="absolute top-1/2 left-1/2 pointer-events-none z-50 w-0 h-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-spark"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
            animationDelay: `${p.delay}s`,
            left: 0,
            top: 0,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
