import React, { useState } from 'react';
import { ActorSubmission } from '../types';
import RejectionModal from './RejectionModal';

interface ActorSubmissionsTabProps {
    submissions: ActorSubmission[];
    onRefresh: () => void;
}

export const ActorSubmissionsTab: React.FC<ActorSubmissionsTabProps> = ({ submissions, onRefresh }) => {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectionTarget, setRejectionTarget] = useState<ActorSubmission | null>(null);
    const [error, setError] = useState('');

    const handleApprove = async (submissionId: string) => {
        setProcessingId(submissionId);
        setError('');
        try {
            const password = sessionStorage.getItem('adminPassword');
            const response = await fetch('/api/approve-actor-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to approve.');
            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (reason: string) => {
        if (!rejectionTarget) return;
        setProcessingId(rejectionTarget.id);
        setError('');
        try {
            const password = sessionStorage.getItem('adminPassword');
            const response = await fetch('/api/reject-actor-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId: rejectionTarget.id, password, reason }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to reject.');
            setRejectionTarget(null);
            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setProcessingId(null);
        }
    };

    const pendingSubmissions = submissions.filter(s => s.status === 'pending');
    const processedSubmissions = submissions.filter(s => s.status !== 'pending');

    return (
        <div className="space-y-8">
            {error && <div className="p-4 mb-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{error}</div>}
            
            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Pending Actor Submissions ({pendingSubmissions.length})</h2>
                {pendingSubmissions.length > 0 ? (
                    <div className="space-y-4">
                        {pendingSubmissions.map(sub => (
                            <div key={sub.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-shrink-0">
                                        <img src={sub.photoUrl} alt={sub.actorName} className="w-24 h-24 object-cover rounded-full" />
                                        <img src={sub.highResPhotoUrl} alt={`${sub.actorName} high-res`} className="w-24 h-36 object-cover rounded-md mt-2" />
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="text-lg font-bold text-white">{sub.actorName}</h3>
                                        <p className="text-sm text-gray-400">{sub.email}</p>
                                        {sub.imdbUrl && <a href={sub.imdbUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">IMDb Profile</a>}
                                        <p className="text-sm text-gray-300 mt-2">{sub.bio}</p>
                                        <p className="text-xs text-gray-500 mt-2">Submitted: {sub.submissionDate ? new Date(sub.submissionDate.seconds * 1000).toLocaleString() : 'N/A'}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 flex-shrink-0 w-full md:w-32">
                                        <button
                                            onClick={() => handleApprove(sub.id)}
                                            disabled={processingId === sub.id}
                                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm w-full"
                                        >
                                            {processingId === sub.id ? '...' : 'Approve'}
                                        </button>
                                        <button
                                            onClick={() => setRejectionTarget(sub)}
                                            disabled={processingId === sub.id}
                                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm w-full"
                                        >
                                            {processingId === sub.id ? '...' : 'Reject'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No pending submissions.</p>
                )}
            </div>

            <div>
                <h2 className="text-xl font-bold text-white mb-4">Processed Submissions ({processedSubmissions.length})</h2>
                {processedSubmissions.length > 0 && (
                     <div className="space-y-2 max-h-96 overflow-y-auto">
                        {processedSubmissions.map(sub => (
                            <div key={sub.id} className={`p-3 rounded-md text-sm ${sub.status === 'approved' ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                                <span className="font-bold">{sub.actorName}</span> - <span className={`font-semibold ${sub.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>{sub.status.toUpperCase()}</span>
                            </div>
                        ))}
                     </div>
                )}
            </div>

            {rejectionTarget && (
                <RejectionModal
                    actorName={rejectionTarget.actorName}
                    onConfirm={handleReject}
                    onCancel={() => setRejectionTarget(null)}
                />
            )}
        </div>
    );
};
