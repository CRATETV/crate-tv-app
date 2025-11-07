import React, { useState, useEffect } from 'react';
import S3Uploader from './S3Uploader';
import LoadingSpinner from './LoadingSpinner';

interface Contract {
    id: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: any; // Firestore Timestamp
}

const ContractsTab: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchContracts = async () => {
        setIsLoading(true);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/manage-contracts', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${password}` },
            });
            if (!res.ok) throw new Error('Failed to fetch contracts.');
            const data = await res.json();
            setContracts(data.contracts || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchContracts();
    }, []);

    const handleUploadSuccess = async (url: string, file?: File) => {
        if (!file) return;
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/manage-contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
                body: JSON.stringify({ fileName: file.name, fileUrl: url }),
            });
            if (!res.ok) throw new Error('Failed to save contract record.');
            await fetchContracts(); // Refresh list
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save contract.');
        }
    };
    
    const handleDelete = async (contractId: string) => {
        if (!window.confirm("Are you sure you want to delete this file record? This does not delete the file from storage.")) return;
        setProcessingId(contractId);
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch(`/api/manage-contracts?id=${contractId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${password}` },
            });
            if (!res.ok) throw new Error('Failed to delete contract record.');
            await fetchContracts(); // Refresh list
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Failed to delete contract.');
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">File Cabinet / Contracts</h2>
            <p className="text-gray-400">Upload and manage important documents like filmmaker contracts and agreements.</p>
            
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <S3Uploader 
                    label="Upload New Document"
                    onUploadSuccess={handleUploadSuccess}
                />
            </div>
            
            {error && <p className="text-red-400">{error}</p>}
            
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Uploaded Documents ({contracts.length})</h3>
                <div className="space-y-3">
                    {contracts.map(contract => (
                        <div key={contract.id} className="bg-gray-700/50 p-3 rounded-md flex justify-between items-center">
                            <div>
                                <a href={contract.fileUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-400 hover:underline">{contract.fileName}</a>
                                <p className="text-xs text-gray-500 mt-1">Uploaded: {contract.uploadedAt ? new Date(contract.uploadedAt.seconds * 1000).toLocaleString() : 'N/A'}</p>
                            </div>
                            <button 
                                onClick={() => handleDelete(contract.id)} 
                                disabled={processingId === contract.id}
                                className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md disabled:bg-gray-600"
                            >
                                {processingId === contract.id ? '...' : 'Delete'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ContractsTab;
