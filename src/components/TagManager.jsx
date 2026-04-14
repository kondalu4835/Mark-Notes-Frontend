import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { tagsApi } from '../api';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4'];

const TagManager = ({ noteTags = [], allTags = [], onTagsChange, onTagsRefresh }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const noteTagIds = noteTags.map(t => t.id);

  const filtered = allTags.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (tag) => {
    const has = noteTagIds.includes(tag.id);
    const newTags = has ? noteTags.filter(t => t.id !== tag.id) : [...noteTags, tag];
    onTagsChange(newTags);
  };

  const handleCreate = async () => {
    if (!search.trim()) return;
    try {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const res = await tagsApi.create({ name: search.trim(), color });
      const newTag = res.data.tag;
      onTagsRefresh();
      const newTags = [...noteTags, newTag];
      onTagsChange(newTags);
      setSearch('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create tag');
    }
  };

  const showCreate = search.trim() && !allTags.find(t => t.name.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="note-tags-row">
      {noteTags.map(tag => (
        <span
          key={tag.id}
          className="tag-badge"
          style={{ background: `${tag.color}25`, color: tag.color }}
        >
          {tag.name}
          <button
            className="remove-tag"
            onClick={() => handleToggle(tag)}
          >×</button>
        </span>
      ))}

      <div className="tag-dropdown" ref={dropdownRef}>
        <button className="add-tag-btn" onClick={() => setOpen(!open)}>
          <Plus size={11} /> Add tag
        </button>
        {open && (
          <div className="tag-dropdown-menu">
            <input
              type="text"
              placeholder="Search or create tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && showCreate && handleCreate()}
              autoFocus
            />
            {filtered.map(tag => (
              <div key={tag.id} className="tag-option" onClick={() => handleToggle(tag)}>
                <span className="tag-dot" style={{ background: tag.color }} />
                {tag.name}
                {noteTagIds.includes(tag.id) && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontSize: '0.8rem' }}>✓</span>}
              </div>
            ))}
            {showCreate && (
              <div className="tag-option create-tag-option" onClick={handleCreate}>
                <Plus size={13} /> Create "{search.trim()}"
              </div>
            )}
            {filtered.length === 0 && !showCreate && (
              <div style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No tags found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TagManager;
