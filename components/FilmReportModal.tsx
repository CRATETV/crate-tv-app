import React, { useEffect, useState } from 'react';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;
const formatNumber = (num: number) => num.toLocaleString();

interface FilmReportModalProps {
    filmData: {
        title: string;
        director: string;
        views: number;
        likes: number;
        watchlistAdds: number;
        donations: number;
        crateTvCut: number;
        filmmakerDonationPayout: number;
        adRevenue: number;
        filmmakerAdPayout: number;
        totalFilmmakerPayout: number;
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
    const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [emailMessage, setEmailMessage] = useState('');

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

    const handleEmailReport = async () => {
        setEmailStatus('sending');
        setEmailMessage('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/email-film-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, filmData }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to send email.');
            setEmailStatus('success');
            setEmailMessage(data.message);
        } catch (err) {
            setEmailStatus('error');
            setEmailMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };

    const handleDownloadCsv = () => {
        const headers = [
            "Metric",
            "Value"
        ];
    
        const rows = [
            ["Film Title", `"${filmData.title.replace(/"/g, '""')}"`],
            ["Director", `"${filmData.director.replace(/"/g, '""')}"`],
            ["--- Performance ---", ""],
            ["Total Views", filmData.views],
            ["Total Likes", filmData.likes],
            ["Total 'My List' Adds", filmData.watchlistAdds],
            ["--- Financials (in Cents) ---", ""],
            ["Total Donations Received", filmData.donations],
            ["Filmmaker Donation Payout (70%)", filmData.filmmakerDonationPayout],
            ["Total Ad Revenue", filmData.adRevenue],
            ["Filmmaker Ad Payout (50%)", filmData.filmmakerAdPayout],
            ["--- Total Payout (in Cents) ---", ""],
            ["Total Filmmaker Payout", filmData.totalFilmmakerPayout]
        ];
    
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");
    
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const safeFileName = filmData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute("download", `crate_tv_report_${safeFileName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="printable-film-report p-8">
                    <div className="text-center mb-8">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" alt="Crate TV" className="w-32 h-auto mx-auto mb-4" />
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
                        <ReportRow label="Total 'My List' Adds" value={formatNumber(filmData.watchlistAdds)} />

                        <h4 className="text-lg font-semibold text-gray-300 mt-6 mb-2">Financial Breakdown</h4>
                        <ReportRow label="Total Donations Received" value={formatCurrency(filmData.donations)} />
                        <ReportRow label="Filmmaker Donation Payout (70%)" value={formatCurrency(filmData.filmmakerDonationPayout)} />
                        <hr className="border-gray-600 my-2" />
                        <ReportRow label="Total Ad Revenue (from views)" value={formatCurrency(filmData.adRevenue)} />
                        <ReportRow label="Filmmaker Ad Payout (50%)" value={formatCurrency(filmData.filmmakerAdPayout)} />
                        <hr className="border-gray-600 my-2" />
                        <ReportRow label="Total Filmmaker Payout" value={formatCurrency(filmData.totalFilmmakerPayout)} isBold={true} className="text-green-400" />
                    </div>
                </div>
                
                 <div className="no-print bg-gray-900/50 p-4 rounded-b-lg">
                    {emailMessage && <p className={`text-center text-sm mb-2 ${emailStatus === 'error' ? 'text-red-400' : 'text-green-400'}`}>{emailMessage}</p>}
                    <div className="flex justify-end gap-4">
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition">Close</button>
                        <button onClick={handleDownloadCsv} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Download CSV</button>
                        <button onClick={handleEmailReport} disabled={emailStatus === 'sending'} className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-2 px-4 rounded-md">
                            {emailStatus === 'sending' ? 'Sending...' : 'Email to Filmmaker'}
                        </button>
                        <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Print Report</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilmReportModal;