
import React, { useState, useEffect } from 'react';
import S3Uploader from './S3Uploader';
import LoadingSpinner from './LoadingSpinner';

interface Contract {
    id: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: any;
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
            if (!res.ok) throw new Error('Failed to fetch vault.');
            const data = await res.json();
            setContracts(data.contracts || []);
        } catch (err) {
            setError('Vault downlink failed.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchContracts(); }, []);

    const handleUploadSuccess = async (url: string, file?: File) => {
        if (!file) return;
        const password = sessionStorage.getItem('adminPassword');
        try {
            await fetch('/api/manage-contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
                body: JSON.stringify({ fileName: file.name, fileUrl: url }),
            });
            fetchContracts();
        } catch (err) {
            setError('Document ingest failed.');
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!window.confirm("PURGE PROTOCOL: Permanently remove this document record?")) return;
        setProcessingId(id);
        const password = sessionStorage.getItem('adminPassword');
        try {
            await fetch(`/api/manage-contracts?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${password}` },
            });
            fetchContracts();
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out] pb-24">
            <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-3xl flex justify-between items-center shadow-xl">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Document Vault</h2>
                    <p className="text-gray-400 mt-1 uppercase font-bold tracking-widest text-[10px]">Secure storage for filmmaker contracts & deal memos</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Storage Status</p>
                    <p className="text-white font-bold uppercase">Encrypted S3</p>
                </div>
            </div>

            <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                <S3Uploader label="Ingest New Legal Document (PDF/DOC)" onUploadSuccess={handleUploadSuccess} />
                
                <div className="mt-12 space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 px-4">Active Agreements ({contracts.length})</h3>
                    <div className="bg-black border border-white/10 rounded-3xl overflow-hidden">
                        {contracts.length === 0 ? (
                            <div className="p-20 text-center opacity-20">
                                <p className="text-sm font-black uppercase tracking-widest">Vault Empty</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {contracts.map(c => (
                                    <div key={c.id} className="p-6 flex justify-between items-center hover:bg-white/[0.02] transition-colors group">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-gray-500 group-hover:text-red-500 transition-colors">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 010.707 0.293l5.414 5.414a1 1 0 010.293 0.707V19a2 2 0 01-2 2z" /></svg>
                                            </div>
                                            <div>
                                                <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className="text-lg font-black text-white uppercase tracking-tight hover:text-red-500 transition-colors">{c.fileName}</a>
                                                <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">Uplinked: {c.uploadedAt?.seconds ? new Date(c.uploadedAt.seconds * 1000).toLocaleDateString() : 'Just now'}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete(c.id)} disabled={processingId === c.id} className="text-[10px] font-black uppercase text-gray-700 hover:text-red-500 transition-colors">
                                            {processingId === c.id ? 'Purging...' : 'Revoke'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractsTab;
