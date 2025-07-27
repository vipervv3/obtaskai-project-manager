import React, { useState, useEffect } from 'react';
import voiceService from '../../services/voiceService';
import {
  CloudIcon,
  PlayIcon,
  PauseIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CalendarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Recording {
  name: string;
  size: number;
  created_at: string;
  url: string;
}

interface RecordingLibraryProps {
  onClose?: () => void;
  onSelectRecording?: (url: string, name: string) => void;
}

const RecordingLibrary: React.FC<RecordingLibraryProps> = ({ onClose, onSelectRecording }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      setError(null);
      const recordingList = await voiceService.getBackedUpRecordings();
      setRecordings(recordingList);
    } catch (error: any) {
      console.error('Failed to load recordings:', error);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const togglePlayback = (url: string) => {
    if (playingUrl === url) {
      setPlayingUrl(null);
      // Stop audio playback
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => audio.pause());
    } else {
      setPlayingUrl(url);
      // Play audio
      const audio = new Audio(url);
      audio.play().catch(console.error);
      audio.onended = () => setPlayingUrl(null);
    }
  };

  const downloadRecording = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="card max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading your recordings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recording Library</h3>
          <p className="text-sm text-gray-600">
            Your backed up voice recordings ({recordings.length} total)
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <button onClick={loadRecordings} className="btn-primary text-sm mt-2">
            Retry
          </button>
        </div>
      )}

      {recordings.length === 0 ? (
        <div className="text-center py-12">
          <CloudIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recordings found</h3>
          <p className="text-gray-600 mb-4">
            Your backed up recordings will appear here. Recordings are automatically backed up for long meetings.
          </p>
          {onClose && (
            <button onClick={onClose} className="btn-primary">
              Start Recording
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {recordings.map((recording, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <CloudIcon className="w-5 h-5 text-blue-500" />
                    <h4 className="font-medium text-gray-900 truncate">
                      {recording.name.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-/, '')}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {formatDate(recording.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {formatFileSize(recording.size)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => togglePlayback(recording.url)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Play/Pause"
                  >
                    {playingUrl === recording.url ? (
                      <PauseIcon className="w-5 h-5" />
                    ) : (
                      <PlayIcon className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={() => downloadRecording(recording.url, recording.name)}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                  </button>

                  {onSelectRecording && (
                    <button
                      onClick={() => onSelectRecording(recording.url, recording.name)}
                      className="btn-primary text-sm"
                    >
                      Process
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Tips for Long Recordings:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Recordings over 45 minutes are automatically backed up</li>
          <li>• Files over 25MB may need to be split for transcription</li>
          <li>• Your recordings are safely stored and can be processed later</li>
          <li>• Download recordings to save them locally</li>
        </ul>
      </div>
    </div>
  );
};

export default RecordingLibrary;