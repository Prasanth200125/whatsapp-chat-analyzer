import { useState, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import './UploadZone.css';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function UploadZone({ onClose }) {
  const [dragover, setDragover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);
  const { uploadFile } = useApp();

  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    if (!file.name.toLowerCase().endsWith('.txt')) {
      return 'Only .txt files are allowed. Please export your WhatsApp chat as a text file.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.`;
    }
    return null;
  };

  const handleFile = useCallback(async (file) => {
    setError('');
    setSuccess('');

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setProgress(30);

    try {
      setProgress(60);
      const data = await uploadFile(file);
      setProgress(100);
      setSuccess(`Parsed ${data.session.totalMessages} messages from ${data.session.totalParticipants} participants!`);

      // Close after brief success display
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, [uploadFile, onClose]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragover(true);
  };

  const handleDragLeave = () => setDragover(false);

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="upload-overlay" onClick={handleOverlayClick}>
      <div className="card upload-modal" id="upload-modal">
        <div className="upload-header">
          <h2 className="upload-title">Upload Chat Export</h2>
          <p className="upload-subtitle">
            Export your WhatsApp chat as a .txt file and upload it here
          </p>
        </div>

        <div
          className={`upload-zone ${dragover ? 'dragover' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleBrowse}
          id="upload-dropzone"
        >
          <span className="upload-zone-icon">📁</span>
          <div className="upload-zone-text">
            Drag & drop your .txt file here
          </div>
          <div className="upload-zone-hint">
            or <span className="upload-zone-browse">browse files</span>
          </div>
          <div className="upload-zone-hint" style={{ marginTop: '0.5rem' }}>
            Max file size: 50MB
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          accept=".txt"
          style={{ display: 'none' }}
          id="file-input"
        />

        {uploading && (
          <div className="upload-progress">
            <div className="upload-progress-bar">
              <div
                className="upload-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="upload-progress-text">
              {progress < 60 ? 'Uploading...' : progress < 100 ? 'Parsing messages...' : 'Complete!'}
            </div>
          </div>
        )}

        {error && <div className="upload-error">{error}</div>}
        {success && <div className="upload-success">✅ {success}</div>}

        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
          <button className="btn btn-ghost" onClick={onClose} id="upload-cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
