import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Eye, Edit3, Columns, Tag } from 'lucide-react';
import { notesApi, tagsApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import useDebounce from '../hooks/useDebounce';
import Sidebar from '../components/Sidebar';
import TagManager from '../components/TagManager';
import VersionHistory from '../components/VersionHistory';
import renderMarkdown from '../utils/markdown';
import toast from 'react-hot-toast';

const VIEWS = ['split', 'edit', 'preview'];

const Home = ({ theme, onToggleTheme }) => {
  const { user } = useAuth();

  // Note state
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteTags, setNoteTags] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // UI state
  const [view, setView] = useState('split');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [isNewNote, setIsNewNote] = useState(false);

  const debouncedTitle = useDebounce(title, 800);
  const debouncedContent = useDebounce(content, 800);
  const lastSavedRef = useRef({ title: '', content: '', tagIds: [] });
  const activeNoteIdRef = useRef(activeNoteId);
  activeNoteIdRef.current = activeNoteId;

  // Load all tags
  const refreshTags = useCallback(async () => {
    try {
      const res = await tagsApi.list();
      setAllTags(res.data.tags);
    } catch {}
  }, []);

  useEffect(() => { refreshTags(); }, [refreshTags]);

  // Load a note
  const loadNote = useCallback(async (id) => {
    try {
      const res = await notesApi.get(id);
      const note = res.data;
      setActiveNoteId(note.id);
      setTitle(note.title);
      setContent(note.content);
      setNoteTags(note.tags || []);
      lastSavedRef.current = {
        title: note.title,
        content: note.content,
        tagIds: (note.tags || []).map(t => t.id)
      };
      setIsNewNote(false);
      setSaveStatus('');
    } catch {
      toast.error('Failed to load note');
    }
  }, []);

  // Auto-save on debounced changes
  useEffect(() => {
    if (!activeNoteId) return;
    const tagIds = noteTags.map(t => t.id);
    const last = lastSavedRef.current;

    const titleChanged = debouncedTitle !== last.title;
    const contentChanged = debouncedContent !== last.content;
    const tagsChanged = JSON.stringify(tagIds.sort()) !== JSON.stringify([...last.tagIds].sort());

    if (!titleChanged && !contentChanged && !tagsChanged) return;

    const doSave = async () => {
      setSaving(true);
      setSaveStatus('Saving…');
      try {
        await notesApi.update(activeNoteId, {
          title: debouncedTitle,
          content: debouncedContent,
          tagIds
        });
        lastSavedRef.current = { title: debouncedTitle, content: debouncedContent, tagIds };
        setSaveStatus('Saved ✓');
        setSidebarRefresh(r => r + 1);
        setTimeout(() => setSaveStatus(''), 2000);
      } catch {
        setSaveStatus('Save failed');
      } finally {
        setSaving(false);
      }
    };

    doSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedContent, activeNoteId]);

  // Save when tags change immediately
  useEffect(() => {
    if (!activeNoteId || isNewNote) return;
    const tagIds = noteTags.map(t => t.id);
    const last = lastSavedRef.current;
    const tagsChanged = JSON.stringify(tagIds.sort()) !== JSON.stringify([...last.tagIds].sort());
    if (!tagsChanged) return;

    notesApi.update(activeNoteId, { tagIds }).then(() => {
      lastSavedRef.current.tagIds = tagIds;
      setSidebarRefresh(r => r + 1);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteTags]);

  const handleNewNote = async () => {
    try {
      setSaving(true);
      const res = await notesApi.create({ title: 'Untitled Note', content: '' });
      const note = res.data;
      setActiveNoteId(note.id);
      setTitle(note.title);
      setContent(note.content);
      setNoteTags([]);
      lastSavedRef.current = { title: note.title, content: note.content, tagIds: [] };
      setIsNewNote(true);
      setSidebarRefresh(r => r + 1);
      setSaveStatus('');
    } catch {
      toast.error('Failed to create note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = (id) => {
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setTitle('');
      setContent('');
      setNoteTags([]);
    }
  };

  const handleManualSave = async () => {
    if (!activeNoteId) return;
    setSaving(true);
    setSaveStatus('Saving…');
    try {
      await notesApi.update(activeNoteId, {
        title, content,
        tagIds: noteTags.map(t => t.id)
      });
      lastSavedRef.current = { title, content, tagIds: noteTags.map(t => t.id) };
      setSaveStatus('Saved ✓');
      setSidebarRefresh(r => r + 1);
      setTimeout(() => setSaveStatus(''), 2000);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = (note) => {
    setTitle(note.title);
    setContent(note.content);
    setNoteTags(note.tags || []);
    lastSavedRef.current = { title: note.title, content: note.content, tagIds: (note.tags || []).map(t => t.id) };
    setSidebarRefresh(r => r + 1);
  };

  const renderedMarkdown = renderMarkdown(content);

  return (
    <div className="app-layout">
      <Sidebar
        activeNoteId={activeNoteId}
        onSelectNote={loadNote}
        onNewNote={handleNewNote}
        onDeleteNote={handleDeleteNote}
        refreshTrigger={sidebarRefresh}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onShowVersions={() => setShowVersions(v => !v)}
      />

      <div className="editor-area">
        {!activeNoteId ? (
          <div className="editor-empty">
            <Edit3 size={64} />
            <h3>No note selected</h3>
            <p>Select a note from the sidebar or create a new one</p>
            <button
              onClick={handleNewNote}
              style={{ marginTop: '0.5rem', padding: '0.6rem 1.5rem', background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius)', fontWeight: 600 }}
            >
              + New Note
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="editor-toolbar">
              <input
                className="title-input"
                placeholder="Note title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <div className="toolbar-actions">
                <span className={`save-status ${saveStatus === 'Saved ✓' ? 'saved' : ''}`}>
                  {saveStatus}
                </span>

                <div className="view-toggle">
                  <button
                    className={`view-btn ${view === 'edit' ? 'active' : ''}`}
                    onClick={() => setView('edit')}
                    title="Editor only"
                  ><Edit3 size={13} /></button>
                  <button
                    className={`view-btn ${view === 'split' ? 'active' : ''}`}
                    onClick={() => setView('split')}
                    title="Split view"
                  ><Columns size={13} /></button>
                  <button
                    className={`view-btn ${view === 'preview' ? 'active' : ''}`}
                    onClick={() => setView('preview')}
                    title="Preview only"
                  ><Eye size={13} /></button>
                </div>

                <button
                  className="save-btn"
                  onClick={handleManualSave}
                  disabled={saving}
                >
                  <Save size={13} />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Tags row */}
            <TagManager
              noteTags={noteTags}
              allTags={allTags}
              onTagsChange={setNoteTags}
              onTagsRefresh={() => { refreshTags(); setSidebarRefresh(r => r + 1); }}
            />

            {/* Editor panels */}
            <div className="editor-panels">
              {(view === 'edit' || view === 'split') && (
                <div className="editor-panel">
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder={`# Your Note Title\n\nStart writing in **Markdown**...\n\n## Features\n- Live preview\n- Auto-save\n- Version history\n\n\`\`\`js\nconsole.log('Hello!');\n\`\`\``}
                    spellCheck={false}
                  />
                </div>
              )}

              {(view === 'preview' || view === 'split') && (
                <div className="preview-panel">
                  {content.trim() ? (
                    <div
                      className="md-preview"
                      dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                    />
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: '0.5rem' }}>
                      Nothing to preview yet…
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showVersions && activeNoteId && (
        <VersionHistory
          noteId={activeNoteId}
          onClose={() => setShowVersions(false)}
          onRestore={handleRestoreVersion}
        />
      )}
    </div>
  );
};

export default Home;
