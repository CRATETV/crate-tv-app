import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Movie } from '../types';
import Laurel from './Laurel';

interface AwardCardProps {
  movie: Movie;
  award: string;
}

const AwardCard: React.FC<AwardCardProps> = ({ movie, award }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleShare = async () => {
    if (isSharing || !cardRef.current) return;
    setIsSharing(true);
    setShareStatus('idle');

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#111827',
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not create image.');

      const file = new File([blob], `${movie.title.replace(/\s/g, '_')}_award.png`, { type: 'image/png' });
      const shareData = {
        files: [file],
        title: `My film "${movie.title}" won an award!`,
        text: `Excited to share that "${movie.title}" won the ${award} award! Watch it now on Crate TV.`,
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2500);
      } else {
        throw new Error('Image sharing is not supported on this browser.');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Sharing failed:', error);
        setShareStatus('error');
        setTimeout(() => setShareStatus('idle'), 2500);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <div ref={cardRef} className="bg-gray-900 rounded-lg p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-40 h-60 flex-shrink-0">
          <img
            src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
            alt={movie.title}
            crossOrigin="anonymous"
            className="w-full h-full object-cover rounded-md"
          />
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <Laurel awardText={award} />
          </div>
        </div>
        <div className="text-center sm:text-left">
          <p className="font-semibold text-purple-400">WINNER</p>
          <h3 className="text-2xl font-bold text-white">{award}</h3>
          <p className="text-lg text-gray-300 mt-2">for the film</p>
          <p className="text-xl font-semibold text-white">{movie.title}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end items-center gap-4">
        {shareStatus === 'copied' && <span className="text-sm text-green-400">Image copied!</span>}
        {shareStatus === 'error' && <span className="text-sm text-red-400">Sharing failed.</span>}
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm disabled:bg-gray-600"
        >
          {isSharing ? 'Preparing...' : 'Share Award'}
        </button>
      </div>
    </div>
  );
};

export default AwardCard;