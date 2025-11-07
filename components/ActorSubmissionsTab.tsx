import React, { useState, useMemo } from 'react';
import { ActorSubmission, Movie } from '../types';
import RejectionModal from './RejectionModal';

interface ActorSubmissionsTabProps {
    submissions: ActorSubmission[];
    allMovies: Record<string, Movie>;
    onApprove: (submissionId: string) => Promise<void>;
    onReject: (submissionId: string, reason?: string) => Promise<void>;
}

const ActorSubmissionsTab: React.FC<ActorSubmissionsTabProps> = ({ submissions, allMovies, onApprove, onReject }) => {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectionTarget, setRejectionTarget] = useState<ActorSubmission | null>(null);

    const findCurrentActorInfo = (actorName: string) => {
        for (const movie of Object.values(allMovies)) {
            // FIX: Explicitly cast `movie` to type `Movie` to resolve a TypeScript error where it was inferred as `unknown`.
            const actor = (movie as Movie).cast.find(c => c.name.toLowerCase() === actorName.toLowerCase());
            if (actor) {
                return actor;
            }
        }
        return null;
    };

    const handleApprove = async (submissionId: string) => {
        setProcessingId(submissionId);
        await onApprove(submissionId);
        setProcessingId(null);
    };

    const handleConfirmRejection = async (reason: string) => {
        if (!rejectionTarget) return;
        setProcessingId(rejectionTarget.id);
        await onReject(rejectionTarget.id, reason);
        setRejectionTarget(null);
        setProcessingId(null);
    };

    if (submissions.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-800/50 rounded-lg">
                <h3 className="text-xl font-bold text-white">All Clear!</h3>
                <p className="text-gray-400 mt-2">There are no pending actor profile submissions.</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {submissions.map(submission => {
                    const currentInfo = findCurrentActorInfo(submission.actorName);
                    const isProcessing = processingId === submission.id;
                    return (
                        <div key={submission.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{submission.actorName}</h3>
                                    <p className="text-sm text-gray-400">Submitted on: {new Date(submission.submissionDate.seconds * 1000).toLocaleString()}</p>
                                    <p className="text-sm text-gray-400">Email: {submission.email}</p>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleApprove(submission.id)}
                                        disabled={isProcessing}
                                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                                    >
                                        {isProcessing ? 'Approving...' : 'Approve'}
                                    </button>
                                    <button
                                        onClick={() => setRejectionTarget(submission)}
                                        disabled={isProcessing}
                                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                                    >
                                        {isProcessing ? '...' : 'Reject'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                {/* Current Info */}
                                <div className="bg-gray-900/50 p-4 rounded-md">
                                    <h4 className="font-semibold text-gray-300 mb-2">Current Profile</h4>
                                    {currentInfo ? (
                                        <div className="flex gap-4">
                                            <img src={currentInfo.photo} alt="Current" className="w-24 h-24 object-cover rounded-md flex-shrink-0" />
                                            <div>
                                                <p className="text-sm text-gray-400 line-clamp-4">{currentInfo.bio}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">Could not find a current profile for this actor.</p>
                                    )}
                                </div>
                                {/* New Submission */}
                                <div className="bg-blue-900/20 p-4 rounded-md border border-blue-800">
                                    <h4 className="font-semibold text-blue-300 mb-2">New Submission</h4>
                                    <div className="flex gap-4 mb-4">
                                        <img src={submission.photoUrl} alt="New" className="w-24 h-24 object-cover rounded-md flex-shrink-0" />
                                        <img src={submission.highResPhotoUrl} alt="New High-Res" className="w-24 h-24 object-cover rounded-md flex-shrink-0" />
                                    </div>
                                    <p className="text-sm text-gray-300">{submission.bio}</p>
                                    {submission.imdbUrl && (
                                        <a href={submission.imdbUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-yellow-400 hover:underline mt-2 block">
                                            View Submitted IMDb
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {rejectionTarget && (
                <RejectionModal
                    actorName={rejectionTarget.actorName}
                    onConfirm={handleConfirmRejection}
                    onCancel={() => setRejectionTarget(null)}
                />
            )}
        </>
    );
};

export default ActorSubmissionsTab;
