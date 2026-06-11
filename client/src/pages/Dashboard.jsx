import { useState } from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatWindow from '../components/ChatWindow/ChatWindow';
import UploadZone from '../components/Upload/UploadZone';
import { useApp } from '../context/AppContext';

export default function Dashboard() {
  const [showUpload, setShowUpload] = useState(false);
  const { error, clearError } = useApp();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar onUploadClick={() => setShowUpload(true)} />
      <ChatWindow />

      {showUpload && (
        <UploadZone onClose={() => setShowUpload(false)} />
      )}

      {/* Error Toast */}
      {error && (
        <div className="toast toast-error" onClick={clearError}>
          {error}
        </div>
      )}
    </div>
  );
}
