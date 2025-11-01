import React, { useEffect } from 'react';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;
const formatNumber = (num: number) => num.toLocaleString();

interface FilmReportModalProps {
    filmData: {
        title: string;
        director: string;
        views: number;
        likes: number;
        donations: number;
        crateTvCut: number;
        filmmakerPayout: number;
    };
    onClose: () => void;
}

const ReportRow: React.FC<{ label: string; value: string | number; isBold?: boolean; className?: string }> = ({ label, value, isBold, className }) => (
    <div className={`flex justify-between items-center py-3 border-b border-gray-700 ${className || ''}`}>
        <p className="text-gray-400">{label}</p>
        <p className={`text-white ${isBold ? 'font-bold' : ''}`}>{value}</p>
    </div>
);

const FilmReportModal: React.FC<FilmReportModalProps> = ({ filmData, onClose }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="printable-film-report p-8">
                    <div className="text-center mb-8">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className="w-32 h-auto mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white">Film Performance Report</h2>
                        <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="bg-gray-900/50 p-6 rounded-lg mb-6 border border-gray-700">
                        <h3 className="text-xl font-bold text-white">{filmData.title}</h3>
                        <p className="text-gray-400">Directed by {filmData.director}</p>
                    </div>
                    
                    <div className="space-y-2">
                        <h4 className="text-lg font-semibold text-gray-300 mt-6 mb-2">Performance Metrics</h4>
                        <ReportRow label="Total Views" value={formatNumber(filmData.views)} />
                        <ReportRow label="Total Likes" value={formatNumber(filmData.likes)} />

                        <h4 className="text-lg font-semibold text-gray-300 mt-6 mb-2">Financial Breakdown (from Donations)</h4>
                        <ReportRow label="Total Donations Received" value={formatCurrency(filmData.donations)} />
                        <ReportRow label="Crate TV Cut (30%)" value={formatCurrency(filmData.crateTvCut)} className="text-red-400" />
                        <ReportRow label="Filmmaker Payout" value={formatCurrency(filmData.filmmakerPayout)} isBold={true} className="text-green-400" />
                    </div>
                </div>

                <div className="no-print bg-gray-900/50 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">Close</button>
                    <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Print Report</button>
                </div>
            </div>
        </div>
    );
};

export default FilmReportModal;