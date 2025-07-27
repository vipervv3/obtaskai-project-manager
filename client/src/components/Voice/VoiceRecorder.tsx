import React, { useState, useEffect, useRef } from 'react';
import voiceService, { VoiceNote } from '../../services/voiceService';
import {
  MicrophoneIcon,
  StopIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LightBulbIcon,
  FlagIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface VoiceRecorderProps {
  entityType: 'project' | 'task';
  entityId: string;
  entityName: string;
  onNotesExtracted?: (notes: VoiceNote[]) => void;
  onClose?: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  entityType,
  entityId,
  entityName,
  onNotesExtracted,
  onClose
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const [extractedNotes, setExtractedNotes] = useState<VoiceNote[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupUrl, setBackupUrl] = useState<string | null>(null);
  const [showLongRecordingWarning, setShowLongRecordingWarning] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check microphone permission on component mount
    checkMicrophonePermission();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const checkMicrophonePermission = async () => {
    if (!voiceService.isSupported()) {
      setError('Voice recording is not supported in this browser');
      setHasPermission(false);
      return;
    }

    const permission = await voiceService.requestPermission();
    setHasPermission(permission);
    if (!permission) {
      setError('Microphone permission is required for voice recording');
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      await voiceService.startRecording();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to start recording. Please check your microphone.');
    }
  };

  const stopRecording = async () => {
    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const blob = await voiceService.stopRecording();
      setIsRecording(false);
      setAudioBlob(blob);
      
      // Check if recording is very long (>45 minutes or >25MB)
      const durationMinutes = recordingTime / 60;
      const sizeMB = blob.size / (1024 * 1024);
      
      if (durationMinutes > 45 || sizeMB > 25) {
        setShowLongRecordingWarning(true);
        // Auto-backup long recordings
        await backupRecording(blob);
      } else {
        // Start processing immediately for shorter recordings
        setIsProcessing(true);
        await processRecording(blob);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setError('Failed to stop recording');
      setIsRecording(false);
    }
  };

  const backupRecording = async (blob: Blob) => {
    try {
      setIsBackingUp(true);
      setError(null);
      
      // Backup recording to server storage
      const backupResult = await voiceService.backupRecording(blob);
      setBackupUrl(backupResult.backup_url);
      
      setIsBackingUp(false);
      
      // Show success message
      console.log('Recording backed up successfully:', backupResult.backup_url);
    } catch (error: any) {
      console.error('Failed to backup recording:', error);
      setError('Failed to backup recording: ' + (error.message || 'Unknown error'));
      setIsBackingUp(false);
    }
  };

  const processRecording = async (blob: Blob) => {
    try {
      setError(null); // Clear any previous errors
      setShowLongRecordingWarning(false);
      
      // For large recordings, backup first
      const sizeMB = blob.size / (1024 * 1024);
      if (sizeMB > 20 && !backupUrl) {
        await backupRecording(blob);
      }
      
      // Transcribe audio
      const transcriptionText = await voiceService.transcribeAudio(blob);
      setTranscription(transcriptionText);

      // Extract intelligent notes
      const notes = voiceService.extractIntelligentNotes(transcriptionText);
      setExtractedNotes(notes);

      setIsProcessing(false);
    } catch (error: any) {
      console.error('Failed to process recording:', error);
      
      // Show the specific error message from the service
      let errorMessage = error.message || 'Failed to process recording. Please try again.';
      
      // If it's a size error and we haven't backed up yet, suggest backup
      if (error.message?.includes('too large') && !backupUrl) {
        errorMessage += ' Your recording has been automatically backed up. You can try again with a shorter segment.';
      }
      
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  const playRecording = () => {
    if (audioBlob && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          // Use a safer approach for creating audio URL
          let audioUrl: string;
          
          // Try URL.createObjectURL first, fallback to FileReader if blocked
          try {
            audioUrl = URL.createObjectURL(audioBlob);
          } catch (error) {
            console.warn('URL.createObjectURL blocked, using FileReader fallback:', error);
            // Use FileReader as fallback
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result && audioRef.current) {
                audioRef.current.src = e.target.result as string;
                audioRef.current.play().catch(console.error);
                setIsPlaying(true);
                
                audioRef.current.onended = () => {
                  setIsPlaying(false);
                };
              }
            };
            reader.readAsDataURL(audioBlob);
            return;
          }
          
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch(console.error);
          setIsPlaying(true);

          audioRef.current.onended = () => {
            setIsPlaying(false);
            try {
              URL.revokeObjectURL(audioUrl);
            } catch (error) {
              console.warn('Failed to revoke object URL:', error);
            }
          };
        } catch (error) {
          console.error('Failed to play recording:', error);
          setError('Failed to play recording. This may be due to browser security restrictions.');
        }
      }
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setTranscription('');
    setExtractedNotes([]);
    setRecordingTime(0);
    setIsPlaying(false);
    setError(null);
  };

  const saveNotes = async () => {
    try {
      setIsProcessing(true);
      await voiceService.saveVoiceNote(entityType, entityId, extractedNotes, transcription);
      
      if (onNotesExtracted) {
        onNotesExtracted(extractedNotes);
      }
      
      setIsProcessing(false);
      
      // Close after successful save
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
      setError('Failed to save notes');
      setIsProcessing(false);
    }
  };

  const testOpenAI = async () => {
    try {
      setIsProcessing(true);
      const result = await voiceService.testOpenAIConnection();
      setTestResult(result);
      setShowDiagnostics(true);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({ success: false, error: 'Test failed' });
      setShowDiagnostics(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  if (hasPermission === false) {
    return (
      <div className="card max-w-md mx-auto text-center">
        <div className="mb-4">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Microphone Access Required</h3>
          <p className="text-gray-600">{error}</p>
        </div>
        <div className="space-y-3">
          <button onClick={checkMicrophonePermission} className="btn-primary w-full">
            Request Permission
          </button>
          {onClose && (
            <button onClick={onClose} className="btn-secondary w-full">
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Voice Notes</h3>
          <p className="text-sm text-gray-600">
            Record voice notes for {entityType}: <span className="font-medium">{entityName}</span>
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        )}
      </div>

      {/* Recording Controls */}
      <div className="space-y-6">
        {/* Recording Status */}
        <div className="text-center">
          {isRecording && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-red-600">Recording...</span>
            </div>
          )}
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <ClockIcon className="w-4 h-4 text-gray-500" />
            <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isProcessing || !hasPermission}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
              >
                <MicrophoneIcon className="w-5 h-5" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-medium"
              >
                <StopIcon className="w-5 h-5" />
                Stop Recording
              </button>
            )}

            {audioBlob && !isRecording && (
              <>
                <button
                  onClick={playRecording}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg"
                >
                  {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                </button>
                <button
                  onClick={deleteRecording}
                  className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Processing Status */}
        {(isProcessing || isBackingUp) && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {isBackingUp ? 'Backing up your recording...' : 'Processing your voice recording...'}
            </p>
          </div>
        )}
        
        {/* Long Recording Warning */}
        {showLongRecordingWarning && audioBlob && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-800 mb-2">Long Recording Detected</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Your recording is {Math.round(recordingTime / 60)} minutes long ({(audioBlob.size / (1024 * 1024)).toFixed(1)}MB). 
                  For best results with long meetings:
                </p>
                <div className="space-y-2 text-sm text-yellow-700">
                  <p>• Recording has been backed up to your account</p>
                  <p>• Large files may take longer to process</p>
                  <p>• Consider splitting very long meetings into segments</p>
                </div>
                {backupUrl && (
                  <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-800">
                    ✅ Backup completed successfully! Your recording is safe.
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => processRecording(audioBlob)}
                    disabled={isProcessing}
                    className="btn-primary text-sm disabled:opacity-50">
                    Process Anyway
                  </button>
                  <button 
                    onClick={() => setShowLongRecordingWarning(false)}
                    className="btn-secondary text-sm">
                    Keep Recording Only
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <span className="text-red-800">{error}</span>
                {backupUrl && (
                  <div className="mt-2 p-2 bg-blue-100 rounded text-sm text-blue-800">
                    💾 Your recording is safely backed up and can be accessed later.
                  </div>
                )}
                <div className="mt-3">
                  <button 
                    onClick={testOpenAI}
                    disabled={isProcessing}
                    className="btn-secondary text-sm disabled:opacity-50">
                    🔧 Test AI Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Diagnostics */}
        {showDiagnostics && testResult && (
          <div className={`border rounded-lg p-4 ${
            testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h4 className={`font-medium mb-2 ${
              testResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              🔧 AI Service Diagnostics
            </h4>
            
            {testResult.success ? (
              <div className="text-green-700 text-sm space-y-1">
                <p>✅ OpenAI connection: Working</p>
                <p>✅ Whisper model: {testResult.data?.whisper_available ? 'Available' : 'Not found'}</p>
                <p>✅ API key: Configured ({testResult.data?.api_key_prefix})</p>
                <p>📊 Models available: {testResult.data?.total_models}</p>
              </div>
            ) : (
              <div className="text-red-700 text-sm space-y-1">
                <p>❌ Connection failed: {testResult.error}</p>
                {testResult.details && (
                  <div className="mt-2 bg-red-100 p-2 rounded text-xs font-mono">
                    <pre>{JSON.stringify(testResult.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
            
            <button 
              onClick={() => setShowDiagnostics(false)}
              className="btn-secondary text-xs mt-2">
              Close
            </button>
          </div>
        )}

        {/* Transcription */}
        {transcription && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Transcription</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{transcription}</p>
              </div>
            </div>

            {/* Extracted Notes */}
            {extractedNotes.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Extracted Notes</h4>
                <div className="space-y-3">
                  {extractedNotes.map((note, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getNoteIcon(note.type)}
                          <span className="text-sm font-medium capitalize text-gray-900">
                            {note.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(note.priority)}`}>
                            {note.priority}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(note.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm">{note.content}</p>
                    </div>
                  ))}
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3 pt-4">
                  {onClose && (
                    <button onClick={onClose} className="btn-secondary">
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={saveNotes}
                    disabled={isProcessing}
                    className="btn-primary disabled:opacity-50"
                  >
                    {isProcessing ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Backup Status */}
            {backupUrl && !extractedNotes.length && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckIcon className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-blue-800">Recording Backed Up</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Your recording has been safely stored. You can process it now or retrieve it later.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => audioBlob && processRecording(audioBlob)}
                    disabled={isProcessing || !audioBlob}
                    className="btn-primary text-sm disabled:opacity-50">
                    Process Recording
                  </button>
                  <button 
                    onClick={() => {
                      if (onClose) onClose();
                    }}
                    className="btn-secondary text-sm">
                    Save for Later
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recording Info */}
        {audioBlob && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Duration:</span> {formatTime(recordingTime)}
              </div>
              <div>
                <span className="font-medium">Size:</span> {(audioBlob.size / (1024 * 1024)).toFixed(1)}MB
              </div>
            </div>
            {backupUrl && (
              <div className="mt-2 text-green-600">
                ✅ Backed up successfully
              </div>
            )}
            {error && (
              <div className="mt-2">
                <button 
                  onClick={testOpenAI}
                  disabled={isProcessing}
                  className="btn-secondary text-xs disabled:opacity-50">
                  🔧 Diagnose Issue
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Hidden audio element for playback */}
        <audio ref={audioRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default VoiceRecorder;