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
        searchQuery="" 
        onSearch={() => {}} 
        isScrolled={true}
        onMobileSearchClick={() => {}}
        showSearch={false}
      />
      <main className="flex-grow pt-24 pb-24 md:pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-serif text-5xl md:text-6xl text-gray-700">Getting to Know You</h1>
            <div className="flex items-center justify-center gap-4">
              <h2 className="text-8xl md:text-9xl font-extrabold tracking-widest text-black">BINGO</h2>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-sky-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="mt-4 text-gray-600 bg-gray-200 p-3 rounded-md">
              Find someone that fits each description and write their name in the corresponding spaces.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 md:gap-4">
            {BINGO_PROMPTS.map((prompt, index) => (
              <BingoSquare
                key={index}
                prompt={prompt}
                color={COLORS[index % 4]}
                name={names[index] || ''}
                onNameChange={(newName) => handleNameChange(index, newName)}
              />
            ))}
          </div>

          <div className="text-center mt-8">
            <button onClick={handleReset} className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-lg transition-colors">
                Clear Board
            </button>
          </div>

        </div>
      </main>
      <CollapsibleFooter />
      <BottomNavBar onSearchClick={() => {}} />
    </div>
  );
};

export default BingoPage;
