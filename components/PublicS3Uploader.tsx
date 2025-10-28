import React, { useState, useRef } from 'react';

interface PublicS3UploaderProps {
  onUploadSuccess: (url: string) => void;
  label: string;
}

const PublicS3Uploader: React.FC<PublicS3UploaderProps> = ({ onUploadSuccess, label }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
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

    setStatus('uploading');
    setProgress(0);
    setError('');

    try {
      // Step 1: Get presigned URL from the public API endpoint
      const presignedUrlResponse = await fetch('/api/generate-public-presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!presignedUrlResponse.ok) {
        const errorData = await presignedUrlResponse.json();
        throw new Error(errorData.error || 'Could not get an upload URL.');
      }
      const { signedUrl, publicUrl } = await presignedUrlResponse.json();

      // Step 2: Upload the file directly to S3 using the presigned URL
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setStatus('success');
          onUploadSuccess(publicUrl);
        } else {
          throw new Error(`Upload failed with status: ${xhr.status}`);
        }
      };

      xhr.onerror = () => {
        throw new Error('An error occurred during the upload. Check CORS settings on your S3 bucket.');
      };

      xhr.send(file);

    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      console.error(err);
      setError(message);
      setStatus('error');
    }
  };

  return (
    <div className="bg-gray-700/50 p-3 rounded-md border border-gray-600">
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        <div className="flex items-center gap-2">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="text-sm text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-600 file:text-gray-300 hover:file:bg-gray-500 flex-grow w-full"
            />
            {file && (
                <button
                    type="button"
                    onClick={handleUpload}
                    disabled={status === 'uploading'}
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-1 px-3 rounded-md text-xs"
                >
                    {status === 'uploading' ? 'Uploading...' : 'Upload'}
                </button>
            )}
        </div>
        {status === 'uploading' && (
            <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        )}
        {status === 'success' && <p className="text-green-400 text-xs mt-1">Upload successful! Ready to submit.</p>}
        {status === 'error' && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default PublicS3Uploader;
