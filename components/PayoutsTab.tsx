import React, { useState } from 'react';
import { PayoutRequest } from '../types.ts';

interface PayoutsTabProps {
    payoutRequests: PayoutRequest[];
    onCompletePayout: (requestId: string) => Promise<void>;
}

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

const PayoutsTab: React.FC<PayoutsTabProps> = ({ payoutRequests, onCompletePayout }) => {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleComplete = async (requestId: string) => {
        if (!window.confirm('Are you sure you have sent this payment? This action cannot be undone.')) {
            return;
        }
        setProcessingId(requestId);
        await onCompletePayout(requestId);
        setProcessingId(null);
    };

    const pendingRequests = payoutRequests.filter(p => p.status === 'pending');
    const completedRequests = payoutRequests.filter(p => p.status === 'completed');

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Pending Payout Requests ({pendingRequests.length})</h2>
                {pendingRequests.length > 0 ? (
                    <div className="space-y-4">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <p className="font-bold text-lg text-white">{req.directorName}</p>
                                    <p className="text-yellow-300 font-bold text-2xl">{formatCurrency(req.amount)}</p>
                                    <p className="text-sm text-gray-400">Method: <span className="font-medium text-gray-200">{req.payoutMethod}</span></p>
                                    <p className="text-sm text-gray-400">Details: <span className="font-medium text-gray-200">{req.payoutDetails}</span></p>
                                    <p className="text-xs text-gray-500 mt-1">Requested on: {new Date(req.requestDate.seconds * 1000).toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={() => handleComplete(req.id)}
                                    disabled={processingId === req.id}
                                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors w-full sm:w-auto flex-shrink-0"
                                >
                                    {processingId === req.id ? 'Processing...' : 'Mark as Paid'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No pending payout requests.</p>
                )}
            </div>

            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Completed Payouts ({completedRequests.length})</h2>
                 {completedRequests.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {completedRequests.map(req => (
                            <div key={req.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 opacity-70">
                                <p className="font-bold text-gray-300">{req.directorName} - <span className="text-green-400">{formatCurrency(req.amount)}</span></p>
                                <p className="text-xs text-gray-500">Completed on: {req.completionDate ? new Date(req.completionDate.seconds * 1000).toLocaleString() : 'N/A'}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                     <p className="text-gray-500">No completed payouts yet.</p>
                )}
            </div>
        </div>
    );
};

export default PayoutsTab;
