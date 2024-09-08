'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase/firebase';

interface Note {
  id: string;
  text: string;
  timestamp: string;
}

export default function NotesList() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notesList: Note[] = [];
      querySnapshot.forEach((doc) => {
        notesList.push({ id: doc.id, ...doc.data() } as Note);
      });
      setNotes(notesList);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Le tue note vocali</h2>
      {notes.map((note) => (
        <div key={note.id} className="bg-white p-4 rounded-lg shadow mb-4">
          <p className="text-gray-600 text-sm mb-2">{note.timestamp}</p>
          <p>{note.text}</p>
        </div>
      ))}
    </div>
  );
}