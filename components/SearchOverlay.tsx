import React from 'react';

interface SearchOverlayProps {
    searchQuery: string;
    onSearch: (query: string) => void;
    onClose: () => void;
    onSubmit: (query: string) => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ onClose }) => {
    return (
        <div>
            <p>Search Overlay</p>
            <button onClick={onClose}>Close</button>
        </div>
    );
};

export default SearchOverlay;
