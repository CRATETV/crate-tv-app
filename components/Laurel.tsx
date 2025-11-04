import React from 'react';

interface LaurelProps {
  awardText: string;
  size?: 'small' | 'large';
}

const Laurel: React.FC<LaurelProps> = ({ awardText, size = 'large' }) => {
  const isSmall = size === 'small';
  const viewBox = isSmall ? "0 0 100 100" : "0 0 200 200";
  const textY = isSmall ? "53" : "105";
  const textFontSize = isSmall ? "8px" : "16px";

  return (
    <svg viewBox={viewBox} className="w-full h-full drop-shadow-lg">
      <defs>
        <path id="circlePath" d={isSmall ? "M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" : "M 100, 100 m -70, 0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0"} />
      </defs>
      
      {/* Laurel Wreath */}
      <path
        d={isSmall 
           ? "M 40 10 A 40 40 0 0 0 10 50 A 40 40 0 0 0 40 90" 
           : "M 80 20 A 80 80 0 0 0 20 100 A 80 80 0 0 0 80 180"}
        fill="none"
        stroke="#FFD700"
        strokeWidth="5"
        strokeLinecap="round"
        transform={isSmall ? "translate(10, 0)" : "translate(20, 0)"}
      />
      <path
        d={isSmall 
           ? "M 60 10 A 40 40 0 0 1 90 50 A 40 40 0 0 1 60 90" 
           : "M 120 20 A 80 80 0 0 1 180 100 A 80 80 0 0 1 120 180"}
        fill="none"
        stroke="#FFD700"
        strokeWidth="5"
        strokeLinecap="round"
        transform={isSmall ? "translate(-10, 0)" : "translate(-20, 0)"}
      />
      
      {/* Text */}
      <text fill="#FFFFFF" fontSize={textFontSize} fontWeight="bold" letterSpacing="1">
        <textPath href="#circlePath" startOffset="50%" textAnchor="middle">
          {awardText.toUpperCase()}
        </textPath>
      </text>
    </svg>
  );
};

export default Laurel;