import React from 'react';

interface CastButtonProps {
    videoElement: HTMLVideoElement | null;
}

const CastButton: React.FC<CastButtonProps> = () => {
    return <button>Cast</button>;
};

export default CastButton;
