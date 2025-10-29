import React from 'react';

interface S3UploaderProps {
    label: string;
    onUploadSuccess: (url: string) => void;
}

const S3Uploader: React.FC<S3UploaderProps> = ({ label }) => {
  return (
    <div>
      <label>{label}</label>
      <input type="file" />
    </div>
  );
};

export default S3Uploader;
