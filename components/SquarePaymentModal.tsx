import React from 'react';
import { Movie } from '../types';

interface SquarePaymentModalProps {
    movie: Movie;
    paymentType: 'donation' | 'subscription' | 'pass' | 'block' | 'film';
    onClose: () => void;
    onPaymentSuccess: () => void;
    itemId?: string;
    blockTitle?: string;
}

const SquarePaymentModal: React.FC<SquarePaymentModalProps> = ({ onClose }) => {
  return (
    <div>
        <p>Square Payment Modal</p>
        <button onClick={onClose}>Close</button>
    </div>
  );
};

export default SquarePaymentModal;
