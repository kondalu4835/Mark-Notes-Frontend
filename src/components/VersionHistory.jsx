import React, { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { notesApi } from '../api';
import toast from 'react-hot-toast';

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const VersionHistory = ({ noteId, onClose, onRestore }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!noteId) return;
    setLoading(true);
    notesApi.getVersions(noteId)
      .then(res => setVersions(res.data.versions))
      .catch(() => toast.error('Could not load versions'))
      .finally(() => setLoading(false));
  }, [noteId]);

  const handleRestore = async (versionId) => {
    try {
      const res = await notesApi.restoreVersion(noteId, versionId);
      onRestore(res.data);
      toast.success('Version restored');
    } catch {
      toast.error('Failed to restore');
    }
  };

  return (
    <div className="versions-panel">
      <div className="versions-header">
        <h3>Version History</h3>
        <button className="icon-btn" onClick={onClose}><X size={14} /></button>
      </div>

      <div className="versions-list">
        {loading && (
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <span className="spinner" />
          </div>
        )}
        {!loading && versions.length === 0 && (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No versions saved yet
          </div>
        )}
        {versions.map((v, i) => (
          <div key={v.id} className="version-item">
            <div className="version-date">
              {formatDate(v.created_at)}
              {i === 0 && <span style={{ marginLeft: 6, fontSize: '0.7rem', background: 'var(--accent-light)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 10 }}>Latest</span>}
            </div>
            <div className="version-title">{v.title || 'Untitled'}</div>
            <button className="restore-btn" onClick={() => handleRestore(v.id)}>
              <RotateCcw size={11} style={{ display: 'inline', marginRight: 4 }} />
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VersionHistory;
