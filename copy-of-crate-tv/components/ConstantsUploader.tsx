import React, { useState, useRef } from 'react';

const ConstantsUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'reading' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    if (!window.confirm("Are you sure you want to overwrite all live site data with the contents of this file? This action cannot be undone.")) {
        return;
    }

    setStatus('reading');
    setError('');

    try {
        const password = sessionStorage.getItem('adminPassword');
        if (!password) {
            throw new Error("Authentication error. Please log in again.");
        }

        const fileContent = await file.text();
        setStatus('uploading');

        const response = await fetch('/api/publish-constants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: password,
                fileContent: fileContent,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to publish the file.');
        }

        setStatus('success');
        setFile(null);
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input

    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      console.error(err);
      setError(message);
      setStatus('error');
    }
  };
  
  const getButtonText = () => {
      switch(status) {
          case 'idle': return 'Upload & Publish';
          case 'reading': return 'Reading file...';
          case 'uploading': return 'Publishing...';
          case 'success': return 'Published!';
          case 'error': return 'Retry Upload';
          default: return 'Upload & Publish';
      }
  }

  return (
    <div>
        <div className="flex items-center gap-2">
            <input
                ref={fileInputRef}
                type="file"
                accept=".ts,.txt"
                onChange={handleFileChange}
                className="text-sm text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-600 file:text-gray-300 hover:file:bg-gray-500 flex-grow w-full"
            />
            {file && (
                <button
                    type="button"
                    onClick={handleUpload}
                    disabled={status === 'uploading' || status === 'reading'}
                    className="flex-shrink-0 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md"
                >
                    {getButtonText()}
                </button>
            )}
        </div>
        {status === 'success' && <p className="text-green-400 text-sm mt-2">Live data successfully overwritten. It may take a minute for changes to appear on the site.</p>}
        {status === 'error' && <p className="text-red-400 text-sm mt-2">Error: {error}</p>}
    </div>
  );
};

export default ConstantsUploader;