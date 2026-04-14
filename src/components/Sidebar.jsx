import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, LogOut, Moon, Sun, History, Tag, FileText, X } from 'lucide-react';
import { notesApi, tagsApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import useDebounce from '../hooks/useDebounce';
import toast from 'react-hot-toast';

const formatDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
};

const Sidebar = ({
  activeNoteId,
  onSelectNote,
  onNewNote,
  onDeleteNote,
  refreshTrigger,
  theme,
  onToggleTheme,
  onShowVersions,
}) => {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (activeTag) params.tag = activeTag;
      const res = await notesApi.list(params);
      setNotes(res.data.notes);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeTag]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await tagsApi.list();
      setTags(res.data.tags);
    } catch {}
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes, refreshTrigger]);
  useEffect(() => { fetchTags(); }, [fetchTags, refreshTrigger]);

  const handleDelete = async (id) => {
    try {
      await notesApi.delete(id);
      toast.success('Note deleted');
      setDeleteTarget(null);
      onDeleteNote(id);
      fetchNotes();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">📝</div>
            <span>MarkNotes</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {activeNoteId && (
              <button className="icon-btn" onClick={onShowVersions} title="Version history">
                <History size={15} />
              </button>
            )}
          </div>
        </div>
        <button className="new-note-btn" onClick={onNewNote}>
          <Plus size={15} /> New Note
        </button>
      </div>

      <div className="search-bar" style={{ paddingTop: '0.8rem' }}>
        <div className="search-input-wrap">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {tags.length > 0 && (
        <div className="tags-filter">
          <span
            className={`tag-chip ${activeTag === '' ? 'active' : ''}`}
            onClick={() => setActiveTag('')}
          >All</span>
          {tags.map(t => (
            <span
              key={t.id}
              className={`tag-chip ${activeTag === t.name ? 'active' : ''}`}
              style={activeTag === t.name ? { borderColor: t.color, color: t.color, background: `${t.color}20` } : {}}
              onClick={() => setActiveTag(activeTag === t.name ? '' : t.name)}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="notes-list">
        {loading && (
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <span className="spinner" />
          </div>
        )}
        {!loading && notes.length === 0 && (
          <div className="notes-list-empty">
            <FileText size={40} />
            <p>{search ? 'No notes found' : 'No notes yet. Create one!'}</p>
          </div>
        )}
        {notes.map(note => (
          <div
            key={note.id}
            className={`note-item ${note.id === activeNoteId ? 'active' : ''}`}
            onClick={() => onSelectNote(note.id)}
          >
            <div className="note-item-title">{note.title || 'Untitled'}</div>
            <div className="note-item-preview">{note.content_preview?.replace(/[#*`>]/g, '') || 'Empty note'}</div>
            <div className="note-item-meta">
              <span className="note-item-date">{formatDate(note.updated_at)}</span>
              <div className="note-item-tags">
                {note.tags?.slice(0, 3).map(t => (
                  <span key={t.id} className="mini-tag" style={{ background: `${t.color}25`, color: t.color }}>{t.name}</span>
                ))}
              </div>
            </div>
            <button
              className="note-delete-btn"
              onClick={e => { e.stopPropagation(); setDeleteTarget(note); }}
              title="Delete note"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div className="user-info">
          <div className="user-name">{user?.username}</div>
          <div className="user-email">{user?.email}</div>
        </div>
        <button className="logout-btn" onClick={logout} title="Logout">
          <LogOut size={15} />
        </button>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Note</h3>
            <p>Delete "<strong>{deleteTarget.title || 'Untitled'}</strong>"? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteTarget.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
