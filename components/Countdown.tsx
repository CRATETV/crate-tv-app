import React, { useState, useEffect } from 'react';

interface CountdownProps {
  targetDate: string;
  onEnd?: () => void;
  className?: string;
  prefix?: string;
}

const calculateTimeLeft = (target: Date) => {
  const difference = +target - +new Date();
  let timeLeft = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOver: difference <= 0,
  };

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isOver: false,
    };
  }
  
  return timeLeft;
};

const Countdown: React.FC<CountdownProps> = ({ targetDate, onEnd, className, prefix = 'Premieres in' }) => {
  const [target] = useState(new Date(targetDate));
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(target));

  useEffect(() => {
    // Check if it's already over on mount
    if (timeLeft.isOver) {
        if(onEnd) onEnd();
        return;
    }

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(target);
      setTimeLeft(newTimeLeft);
      if (newTimeLeft.isOver) {
        if(onEnd) onEnd();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [target, onEnd, timeLeft.isOver]);

  if (timeLeft.isOver) {
    return null; // The parent component will handle the "released" state
  }

  const parts = [];
  if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
  if (timeLeft.hours > 0) parts.push(`${timeLeft.hours}h`);
  if (timeLeft.minutes > 0) parts.push(`${timeLeft.minutes}m`);
  // Only show seconds if it's less than an hour away
  if (timeLeft.days === 0 && timeLeft.hours === 0) {
     parts.push(`${timeLeft.seconds}s`);
  }

  return (
    <span className={className}>
      {prefix} {parts.slice(0, 3).join(' ')}
    </span>
  );
};

export default Countdown;