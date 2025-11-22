import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'mimirlink-db';
const DB_VERSION = 1;

// Define the database schema
interface MimirlinkDB extends DBSchema {
  notes: {
    key: string; // path of the note
    value: {
      path: string;
      content: string;
      mtime: string;
    };
  };
  'key-value': {
    key: string;
    value: any;
  };
}

let db: IDBPDatabase<MimirlinkDB>;

// Function to initialize the database
export async function initDB() {
  if (db) {
    return;
  }

  db = await openDB<MimirlinkDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Create the 'notes' object store
      if (!database.objectStoreNames.contains('notes')) {
        database.createObjectStore('notes', { keyPath: 'path' });
      }
      // Create the 'key-value' object store
      if (!database.objectStoreNames.contains('key-value')) {
        database.createObjectStore('key-value');
      }
    },
  });
}

// --- Wrapper functions for 'notes' store ---

export async function getNote(path: string) {
  await initDB();
  return db.get('notes', path);
}

export async function setNote(note: { path: string; content: string; mtime: string }) {
  await initDB();
  return db.put('notes', note);
}

export async function getAllNotes() {
  await initDB();
  return db.getAll('notes');
}

// --- Wrapper functions for 'key-value' store ---

export async function getKeyValue(key: string) {
  await initDB();
  return db.get('key-value', key);
}

export async function setKeyValue(key: string, value: any) {
  await initDB();
  return db.put('key-value', value, key);
}

// Initialize the DB as soon as the module is loaded
initDB().catch(console.error);
