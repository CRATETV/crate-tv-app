import React from 'react';

const LoveThemeOverlay: React.FC = () => {
  // Create an array of heart configurations for variety
  const hearts = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${Math.random() * 8 + 7}s`, // 7-15 seconds for a slow, gentle float
    animationDelay: `${Math.random() * 10}s`,
    size: `${Math.random() * 15 + 10}px`, // 10-25px
    color: ['rgba(255, 122, 122, 0.6)', 'rgba(255, 77, 77, 0.6)', 'rgba(255, 179, 179, 0.6)', 'rgba(232, 130, 168, 0.6)'][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {hearts.map(heart => (
        <div
          key={heart.id}
          className="heart-shape"
          style={{
            left: heart.left,
            width: heart.size,
            height: heart.size,
            animationDuration: heart.animationDuration,
            animationDelay: heart.animationDelay,
            backgroundColor: heart.color,
          }}
        />
      ))}
    </div>
  );
};

export default LoveThemeOverlay;
