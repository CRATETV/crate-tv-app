import React, { useState, useEffect } from 'react';

interface RejectionModalProps {
  actorName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const presetReasons = [
    "The uploaded photo quality is too low. Please provide a high-resolution, professional headshot.",
    "The biography contains formatting issues or typos. Please review and resubmit.",
    "The submitted content does not align with our brand guidelines. Please ensure your bio is professional and concise.",
];

const RejectionModal: React.FC<RejectionModalProps> = ({ actorName, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onCancel]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
        alert("Please provide a reason for the rejection.");
        return;
    }
    setIsSubmitting(true);
    await onConfirm(reason);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onCancel}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-600" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-2">Reject Submission for {actorName}</h2>
              <p className="text-sm text-gray-400 mb-4">The actor will receive an email with the reason you provide below.</p>
              
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain why the submission is being rejected..."
                className="form-input w-full"
                rows={5}
                required
              />
              
              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-400">Or use a preset reason:</p>
                <div className="flex flex-wrap gap-2">
                    {presetReasons.map((preset, i) => (
                        <button key={i} type="button" onClick={() => setReason(preset)} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 py-1 px-3 rounded-full transition-colors">
                            {preset.split('.')[0]}
                        </button>
                    ))}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900/50 p-4 flex justify-end gap-4 rounded-b-lg">
              <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white transition">Cancel</button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-bold py-2 px-4 rounded-md"
              >
                {isSubmitting ? 'Sending...' : 'Send and Reject'}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default RejectionModal;