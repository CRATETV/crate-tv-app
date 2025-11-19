import React, { useState } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';

const BINGO_PROMPTS = [
  "Someone who loves to dance",
  "Someone who has long hair",
  "Someone who has a brother",
  "Someone who is wearing eyeglasses",
  "Someone who is afraid of spiders",
  "Someone who loves fruits",
  "Someone who can play a musical instrument",
  "Someone who likes to read books",
  "Someone who loves sports",
  "Someone who can do a cartwheel",
  "Someone who can speak another language",
  "Someone who owns a pet",
  "Someone who is left-handed",
  "Someone who is scared of heights",
  "Someone who loves to swim",
  "Someone who is born on the same month as you",
];

const COLORS = [
  'bg-rose-200 text-rose-800',
  'bg-sky-200 text-sky-800',
  'bg-amber-200 text-amber-800',
  'bg-rose-200 text-rose-800',
];

interface BingoSquareProps {
  prompt: string;
  color: string;
  name: string;
  onNameChange: (name: string) => void;
}

const BingoSquare: React.FC<BingoSquareProps> = ({ prompt, color, name, onNameChange }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSquareClick = () => {
    setIsEditing(true);
  };

  if (name || isEditing) {
    return (
      <div className={`aspect-square ${color} rounded-lg shadow-md p-3 flex flex-col justify-center items-center text-center`}>
        <p className="text-xs font-semibold mb-2">{prompt}</p>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          placeholder="Name..."
          autoFocus
          className="w-full bg-white/60 rounded-md border-0 text-center p-2 font-bold text-sm focus:ring-2 focus:ring-white"
          aria-label={`Enter name for: ${prompt}`}
        />
      </div>
    );
  }

  return (
    <button
      onClick={handleSquareClick}
      className={`aspect-square ${color} rounded-lg shadow-md p-3 flex flex-col justify-center items-center text-center font-bold transition-transform hover:scale-105`}
      aria-label={`Mark square for: ${prompt}`}
    >
      <p>{prompt}</p>
    </button>
  );
};

const BingoPage: React.FC = () => {
  const [names, setNames] = useState<Record<number, string>>({});

  const handleNameChange = (index: number, newName: string) => {
    setNames(prev => ({ ...prev, [index]: newName }));
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear the board?")) {
        setNames({});
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-800">
      <Header 