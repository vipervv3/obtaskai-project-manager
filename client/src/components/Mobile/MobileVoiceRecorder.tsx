import React, { useState, useEffect } from 'react';
import VoiceRecorder from '../Voice/VoiceRecorder';
import { MicrophoneIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface MobileVoiceRecorderProps {
  entityType: 'project' | 'task';
  entityId: string;
  entityName: string;
  onClose: () => void;
  onNotesExtracted?: (notes: any[]) => void;
}

const MobileVoiceRecorder: React.FC<MobileVoiceRecorderProps> = ({
  entityType,
  entityId,
  entityName,
  onClose,
  onNotesExtracted
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Keep screen awake during recording (if supported)
  useEffect(() => {
    let wakeLock: any = null;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Screen wake lock activated');
        }
      } catch (err) {
        console.log('Wake lock not supported:', err);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
        console.log('Screen wake lock released');
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <MicrophoneIcon className="w-6 h-6 text-primary-600" />
          <div>
            <h2 className="font-semibold text-gray-900">Meeting Recording</h2>
            <p className="text-sm text-gray-600 truncate max-w-48">{entityName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Recorder Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <VoiceRecorder
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          onClose={onClose}
          onNotesExtracted={onNotesExtracted}
        />
      </div>

      {/* Mobile-specific tips */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800 text-center">
            💡 <strong>Mobile Tips:</strong> Keep phone charged • Use speaker mode • 
            Place phone close to speakers for best audio quality
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileVoiceRecorder;