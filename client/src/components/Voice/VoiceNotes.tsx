import React, { useState, useEffect } from 'react';
import voiceService, { VoiceNote } from '../../services/voiceService';
import {
  MicrophoneIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  FlagIcon,
  DocumentTextIcon,
  TrashIcon,
  PlusIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import VoiceRecorder from './VoiceRecorder';

interface VoiceNotesProps {
  entityType: 'project' | 'task';
  entityId: string;
  entityName: string;
  className?: string;
}

const VoiceNotes: React.FC<VoiceNotesProps> = ({
  entityType,
  entityId,
  entityName,
  className = ''
}) => {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecorder, setShowRecorder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVoiceNotes();
  }, [entityType, entityId]);

  const loadVoiceNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading voice notes for:', { entityType, entityId });
      
      const voiceNotes = await voiceService.getVoiceNotes(entityType, entityId);
      console.log('Loaded voice notes:', voiceNotes);
      
      setNotes(voiceNotes);
    } catch (error) {
      console.error('Failed to load voice notes:', error);
      setError('Failed to load voice notes');
    } finally {
      setLoading(false);
    }
  };

  const handleNotesExtracted = (newNotes: VoiceNote[]) => {
    // Reload notes from database to get the most current state
    loadVoiceNotes();
    setShowRecorder(false);
  };

  const deleteNote = async (index: number) => {
    if (window.confirm('Are you sure you want to delete this voice note?')) {
      try {
        // In a real implementation, you'd call an API to delete the note
        const updatedNotes = notes.filter((_, i) => i !== index);
        setNotes(updatedNotes);
      } catch (error) {
        console.error('Failed to delete note:', error);
        setError('Failed to delete note');
      }
    }
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'action':
        return <CheckIcon className="w-4 h-4 text-blue-500" />;
      case 'decision':
        return <FlagIcon className="w-4 h-4 text-green-500" />;
      case 'issue':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      case 'idea':
        return <LightBulbIcon className="w-4 h-4 text-yellow-500" />;
      default:
        return <DocumentTextIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'action':
        return 'bg-blue-50 border-blue-200';
      case 'decision':
        return 'bg-green-50 border-green-200';
      case 'issue':
        return 'bg-red-50 border-red-200';
      case 'idea':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMs = now.getTime() - past.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  if (showRecorder) {
    return (
      <div className={className}>
        <VoiceRecorder
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          onNotesExtracted={handleNotesExtracted}
          onClose={() => setShowRecorder(false)}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MicrophoneIcon className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Voice Notes</h3>
            {notes.length > 0 && (
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                {notes.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowRecorder(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Voice Note
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading voice notes...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && notes.length === 0 && !error && (
          <div className="text-center py-8">
            <MicrophoneIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Voice Notes Yet</h4>
            <p className="text-gray-600 mb-4">
              Record voice notes to capture ideas, action items, and decisions for this {entityType}.
            </p>
            <button
              onClick={() => setShowRecorder(true)}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <MicrophoneIcon className="w-4 h-4" />
              Record First Note
            </button>
          </div>
        )}

        {/* Notes List */}
        {!loading && notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 transition-all hover:shadow-sm ${getTypeColor(note.type)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getNoteIcon(note.type)}
                    <span className="text-sm font-medium capitalize text-gray-900">
                      {note.type}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(note.priority)}`}>
                      {note.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {Math.round(note.confidence * 100)}% confidence
                    </span>
                    <button
                      onClick={() => deleteNote(index)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete note"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-700 text-sm mb-3">{note.content}</p>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ClockIcon className="w-3 h-3" />
                  <span>{formatTimeAgo(note.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {!loading && notes.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            {['action', 'decision', 'issue', 'idea'].map(type => {
              const count = notes.filter(note => note.type === type).length;
              return (
                <div key={type} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {getNoteIcon(type)}
                    <span className="text-sm font-medium capitalize">{type}s</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceNotes;