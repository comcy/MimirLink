import { createSignal, createResource, createMemo, createRoot, createEffect } from 'solid-js';
import { getNote, setNote, getKeyValue, setKeyValue } from './db';
import { format } from 'date-fns';

// --- 1. Typ-Definitionen ---

export interface NoteMetadata {
  path: string;
  title: string;
  date: string;
  type: 'journal' | 'page';
  tags: string[];
}

export interface CategorizedFiles {
  journals: NoteMetadata[];
  pages: NoteMetadata[];
}

export interface Note {
  path: string;
  content: string;
  mtime: string;
  hasUnsavedChanges: boolean;
}

export interface SearchResult {
  path: string;
  title: string;
  context: string;
}

// --- 2. API-Funktionen ---

const API_BASE_URL = 'http://localhost:3001/api';

async function fetchFiles(): Promise<CategorizedFiles> {
  try {
    const response = await fetch(`${API_BASE_URL}/files`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const files = await response.json();
    await setKeyValue('cached-file-list', files);
    return files;
  } catch (error) {
    console.warn('Failed to fetch files from server. Attempting to load from cache.', error);
    const cachedFiles = await getKeyValue('cached-file-list');
    if (cachedFiles) return cachedFiles as CategorizedFiles;
    throw error;
  }
}

async function searchFiles(query: string): Promise<SearchResult[]> {
  const response = await fetch(`${API_BASE_URL}/files/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
  return response.json();
}

export async function fetchFileContent(path: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/files/content?path=${encodeURIComponent(path)}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.text();
}

async function createNoteOnServer(title: string, type: 'page' | 'journal'): Promise<{ path: string }> {
  const response = await fetch(`${API_BASE_URL}/files/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, type }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 409 && errorData.path) return { path: errorData.path };
    throw new Error(errorData.error || `Server error: ${response.statusText}`);
  }
  return response.json();
}

async function updateServerFile(path: string, content: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/files/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
}

async function deleteServerFile(path: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/files`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
}

// --- 3. Store-Erstellung ---

function createNoteStore() {
  // --- Dialog State ---
  const [isNewPageDialogOpen, setIsNewPageDialogOpen] = createSignal(false);

  // --- File & Note State ---
  const [files, { refetch: refetchFiles }] = createResource<CategorizedFiles>(fetchFiles, {
    initialValue: { journals: [], pages: [] },
  });
  const [openNotes, setOpenNotes] = createSignal<Note[]>([]);
  const [activeNotePath, setActiveNotePath] = createSignal<string | null>(null);

  // --- Search State ---
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults] = createResource(searchQuery, searchFiles);

  // --- Derived State (Memos) ---
  const activeNote = createMemo(() => openNotes().find(note => note.path === activeNotePath()));
  const activeContent = createMemo(() => activeNote()?.content ?? '');
  const isSearching = createMemo(() => searchQuery().length > 0);

  // --- Sidebar View State ---
  type SidebarView = 'files' | 'search';
  const [activeSidebarView, setActiveSidebarView] = createSignal<SidebarView>('files');

  // Automatically switch to search view when a search is performed
  createEffect(() => {
    if (isSearching()) {
      setActiveSidebarView('search');
    }
  });

  // --- Aktionen ---
  const performSearch = (query: string) => setSearchQuery(query);

  const openNote = async (path: string) => {
    // Save the currently active note before opening a new one
    await saveNote(activeNote());

    if (openNotes().find(note => note.path === path)) {
      setActiveNotePath(path);
      return;
    }
    try {
      const content = await fetchFileContent(path);
      const note: Note = { path, content, mtime: new Date().toISOString(), hasUnsavedChanges: false };
      setOpenNotes(prev => [...prev, note]);
      setActiveNotePath(path);
      await setKeyValue('last-opened-path', path);
    } catch (error) {
      console.error(`Failed to fetch note: ${path}`, error);
    }
  };

  const closeNote = (path: string, force = false) => {
    const noteToClose = openNotes().find(note => note.path === path);
    if (!noteToClose) return;

    // Save before closing, unless forced
    if (!force) {
      saveNote(noteToClose);
    }

    const noteToCloseIndex = openNotes().findIndex(note => note.path === path);

    if (activeNotePath() === path) {
      const newActiveIndex = noteToCloseIndex > 0 ? noteToCloseIndex - 1 : 0;
      const newOpenNotes = openNotes().filter(note => note.path !== path);
      setActiveNotePath(newOpenNotes[newActiveIndex]?.path ?? null);
    }
    setOpenNotes(prev => prev.filter(note => note.path !== path));
  };

  const updateActiveContent = async (content: string) => {
    const path = activeNotePath();
    if (!path) return;
    setOpenNotes(prev => prev.map(note =>
      note.path === path ? { ...note, content, hasUnsavedChanges: true } : note
    ));
    const note = activeNote();
    if (note) await setNote(note);
  };

  const saveNote = async (noteToSave: Note | undefined | null) => {
    if (noteToSave && noteToSave.hasUnsavedChanges) {
      try {
        await updateServerFile(noteToSave.path, noteToSave.content);
        setOpenNotes(prev => prev.map(n =>
          n.path === noteToSave.path ? { ...n, hasUnsavedChanges: false } : n
        ));
        // No need to refetch files on every save, only on create/delete
      } catch (error) {
        console.error(`Failed to save note to server:`, error);
      }
    }
  };

  const saveCurrentNote = async () => {
    await saveNote(activeNote());
  };

  const createNewPage = () => {
    setIsNewPageDialogOpen(true);
  };

  const confirmCreateNewPage = async (title: string) => {
    if (!title) return;
    try {
      const { path } = await createNoteOnServer(title, 'page');
      await refetchFiles();
      await openNote(path);
    } catch (error) {
      console.error('Failed to create new page:', error);
    }
  };

  const openOrCreateJournalForToday = async () => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const journalPath = `journals/${dateStr}.md`;

    if (openNotes().find(note => note.path === journalPath)) {
      setActiveNotePath(journalPath);
      return;
    }

    const existingJournal = files()?.journals.find(j => j.path === journalPath);
    if (existingJournal) {
      await openNote(journalPath);
      return;
    }

    try {
      const { path } = await createNoteOnServer(`Journal for ${dateStr}`, 'journal');
      await refetchFiles();
      await openNote(path);
    } catch (error) {
      console.error('Failed to create or open journal:', error);
    }
  };

  const deleteNote = async (path: string) => {
    try {
      const response = await deleteServerFile(path);
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      // Close the tab if it's open, without saving
      closeNote(path, true);
      // Refresh the file list
      await refetchFiles();
    } catch (error) {
      console.error(`Failed to delete note:`, error);
      // Optionally, show an error to the user
    }
  };

  const initialize = async () => {
    const lastPath = await getKeyValue('last-opened-path');
    if (typeof lastPath === 'string') await openNote(lastPath);
  };

  initialize().catch(console.error);

  return {
    // State
    files,
    openNotes,
    activeNotePath,
    searchQuery,
    searchResults,
    isNewPageDialogOpen,
    // Actions
    refetchFiles,
    openNote,
    closeNote,
    deleteNote,
    setActiveNotePath,
    updateActiveContent,
    createNewPage,
    confirmCreateNewPage,
    setIsNewPageDialogOpen,
    openOrCreateJournalForToday,
    saveCurrentNote,
    performSearch,
    // Computed
    activeNote,
    activeContent,
    isSearching,
    activeSidebarView,
    setActiveSidebarView,
    get isLoading() { return files.loading; },
  };
}

export const store = createRoot(createNoteStore);
