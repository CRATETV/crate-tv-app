import React from 'react';
import { Movie } from '../types';

interface DirectorCreditsModalProps {
    directorName: string;
    onClose: () => void;
    allMovies: Record<string, Movie>;
    onSelectMovie: (movie: Movie) => void;
}

const DirectorCreditsModal: React.FC<DirectorCreditsModalProps> = ({ directorName, onClose }) => {
    return (
        <div>
            <h2>Credits for {directorName}</h2>
            <button onClick={onClose}>Close</button>
        </div>
    );
};

export default DirectorCreditsModal;
