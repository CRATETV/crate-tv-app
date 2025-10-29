import React from 'react';

interface CountdownProps {
    targetDate: string;
    onEnd: () => void;
    className?: string;
}

const Countdown: React.FC<CountdownProps> = ({ className }) => {
  return <div className={className}>Countdown Timer</div>;
};

export default Countdown;
