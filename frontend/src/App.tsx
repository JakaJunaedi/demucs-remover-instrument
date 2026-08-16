import React, { useState } from 'react'
import { AudioUploader } from '@/components/AudioUploader'

function App() {
  const [taskId, setTaskId] = useState<string | null>(null)

  const handleTaskQueued = (id: string) => {
    setTaskId(id)
    console.log("Task queued:", id)
    // Next phase: poll status and show progress
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <header className="border-b border-border bg-card p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-primary">Vocal</span>Remover
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-10 max-w-xl">
          <h2 className="text-3xl font-bold mb-4">Pisahkan Vokal & Instrumen</h2>
          <p className="text-text-secondary">
            Unggah file audio Anda dan AI kami akan memisahkan vokal dan instrumen secara otomatis menggunakan model Demucs dengan kualitas tinggi.
          </p>
        </div>

        {!taskId ? (
          <AudioUploader onTaskQueued={handleTaskQueued} />
        ) : (
          <div className="p-8 border border-border rounded-xl bg-card w-full max-w-2xl text-center">
            <h3 className="text-xl font-semibold mb-2 text-primary">Proses Dimulai</h3>
            <p className="text-text-secondary mb-4">Task ID: {taskId}</p>
            <p className="text-sm text-text-secondary border border-border/50 bg-background p-4 rounded-md">
              (UI Polling & Waveform akan diimplementasikan pada Fase 2)
            </p>
            <button 
              onClick={() => setTaskId(null)}
              className="mt-6 px-4 py-2 border border-border hover:bg-hover rounded-md transition-colors text-sm"
            >
              Upload file lain
            </button>
          </div>
        )}
      </main>

      <footer className="p-4 text-center text-sm text-text-secondary border-t border-border mt-auto">
        Vocal Remover Web App MVP &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}

export default App
