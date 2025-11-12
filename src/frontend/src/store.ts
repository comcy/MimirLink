import { createSignal, createResource, createMemo } from 'solid-js';
import { getNote, setNote, getKeyValue, setKeyValue } from './db';
import { format } from 'date-fns';

// --- 0. Initial Content ---
const initialMarkdown = `# Welcome to Mimirlink!

Select a file or create a new one.
`;

const newNoteTemplate = (title: string) => `---
title: ${title}
date: ${format(new Date(), 'yyyy-MM-dd')}
tags: 
---

`;

// --- 1. Typ-Definitionen ---

export interface FileMetadata {
  path: string;
  mtime: string;
  pageType: 'journal' | 'page';
}

export interface CategorizedFiles {
  journals: FileMetadata[];
  pages: FileMetadata[];
}

export interface Note {
  path: string;
  content: string;
  mtime: string;
}

// --- 2. API-Funktionen ---

const API_BASE_URL = 'http://localhost:3001/api';

async function fetchFiles(): Promise<CategorizedFiles> {
  const response = await fetch(`${API_BASE_URL}/files`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchFileContent(path: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/files/content?path=${encodeURIComponent(path)}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.text();
}

async function createServerFile(path: string, content: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/files/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
}

async function updateServerFile(path: string, content: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/files/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
}


// --- 3. Store-Erstellung ---

function createNoteStore() {
  // Resource für die Dateiliste vom Server
  const [files, { refetch: refetchFiles }] = createResource<CategorizedFiles>(fetchFiles, {
    initialValue: { journals: [], pages: [] },
  });

  // --- State for Tabs ---
  const [openNotes, setOpenNotes] = createSignal<Note[]>([]);
  const [activeNotePath, setActiveNotePath] = createSignal<string | null>(null);

  // --- Derived State (Memos) ---
  const activeNote = createMemo<Note | null>(() => {
    const path = activeNotePath();
    if (!path) return null;
    return openNotes().find(note => note.path === path) || null;
  });

  const activeContent = createMemo<string>(() => {
    return activeNote()?.content ?? initialMarkdown;
  });

  // --- Aktionen ---

  const openNote = async (path: string) => {
    // 1. Check if already open
    const alreadyOpen = openNotes().find(note => note.path === path);
    if (alreadyOpen) {
      setActiveNotePath(path); // Just make it active
      return;
    }

    // 2. If not open, fetch and add to tabs
    try {
      const cachedNote = await getNote(path);
      if (cachedNote) {
        setOpenNotes(prev => [...prev, cachedNote]);
        setActiveNotePath(path);
      }

      const content = await fetchFileContent(path);
      const note: Note = { path, content, mtime: new Date().toISOString() };

      // Update if already in list from cache, otherwise add
      setOpenNotes(prev => {
        const existing = prev.find(n => n.path === path);
        if (existing) {
          return prev.map(n => n.path === path ? note : n);
        }
        return [...prev, note];
      });

      setActiveNotePath(path);
      await setNote(note);
      await setKeyValue('last-opened-path', path);
    } catch (error) {
      console.error(`Failed to fetch note: ${path}`, error);
      // Optionally, show an error note as a tab
    }
  };

  const closeNote = (path: string) => {
    const noteToCloseIndex = openNotes().findIndex(note => note.path === path);
    if (noteToCloseIndex === -1) return;

    // If closing the active note, determine the next active note
    if (activeNotePath() === path) {
      const newActiveIndex = noteToCloseIndex > 0 ? noteToCloseIndex - 1 : 0;
      const newOpenNotes = openNotes().filter(note => note.path !== path);
      if (newOpenNotes.length > 0) {
        setActiveNotePath(newOpenNotes[newActiveIndex]?.path ?? null);
      } else {
        setActiveNotePath(null);
      }
    }
    setOpenNotes(prev => prev.filter(note => note.path !== path));
  };

  const updateActiveContent = async (content: string) => {
    const path = activeNotePath();
    if (!path) return;

    setOpenNotes(prev => prev.map(note =>
      note.path === path ? { ...note, content } : note
    ));

    const note = activeNote();
    if (note) {
      await setNote(note); // Autosave to local DB
    }
  };

  const saveCurrentNote = async () => {
    const note = activeNote();
    if (note) {
      try {
        const response = await updateServerFile(note.path, note.content);
        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }
        console.log(`Note '${note.path}' saved to server.`);
      } catch (error) {
        console.error(`Failed to save note to server:`, error);
      }
    }
  };

  const createNewNote = async () => {
    const fileName = prompt('Enter the name for the new note (e.g., "My New Idea"):');
    if (!fileName) return;

    const path = `${fileName.replace(/\s+/g, '-')}.md`;
    const content = newNoteTemplate(fileName);
    const note: Note = { path, content, mtime: new Date().toISOString() };

    // 1. Add to open notes and make active
    setOpenNotes(prev => [...prev, note]);
    setActiveNotePath(path);
    await setNote(note);
    await setKeyValue('last-opened-path', path);

    // 2. Try to save to server
    try {
      const response = await createServerFile(path, content);
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      console.log(`New note '${path}' created on server.`);
      // 3. Refresh file list from server
      refetchFiles();
    } catch (error) {
      console.error(`Failed to create note on server:`, error);
    }
  };

  // --- Initialisierung ---
  const initialize = async () => {
    const lastPath = await getKeyValue('last-opened-path');
    if (typeof lastPath === 'string') {
      await openNote(lastPath);
    }
  };

  initialize().catch(console.error);


  return {
    // State
    files,
    openNotes,
    activeNotePath,
    
    // Actions
    refetchFiles,
    openNote,
    closeNote,
    setActiveNotePath,
    updateActiveContent,
    createNewNote,
    saveCurrentNote,
    
    // Computed
    activeNote,
    activeContent,
    isLoading: files.loading,
  };
}

// --- 4. Globale Store-Instanz ---

export const store = createNoteStore();
