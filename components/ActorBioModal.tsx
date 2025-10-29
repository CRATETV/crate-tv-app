import React from 'react';
import { Actor } from '../types';

interface ActorBioModalProps {
    actor: Actor;
    onClose: () => void;
}

const ActorBioModal: React.FC<ActorBioModalProps> = ({ actor, onClose }) => {
    return (
        <div className="modal">
            <h2>{actor.name}</h2>
            <button onClick={onClose}>Close</button>
        </div>
    );
};

export default ActorBioModal;
