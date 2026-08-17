import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import { toast } from 'sonner'

type TaskStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed'

interface YoutubeState {
  taskId: string | null;
  status: TaskStatus;
  progressData: any;
  error: string | null;
  startDownload: (url: string, bitrate: string) => Promise<void>;
  startPolling: (id: string) => void;
  stopPolling: () => void;
  reset: () => void;
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const useYoutubeStore = create<YoutubeState>()(
  persist(
    (set, get) => ({
      taskId: null,
      status: 'idle',
      progressData: null,
      error: null,
      
      startDownload: async (url, bitrate) => {
        try {
          const res = await axios.post('http://localhost:8000/api/v1/youtube/download', { url, bitrate });
          const id = res.data.task_id;
          get().startPolling(id);
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Gagal memulai unduhan.");
        }
      },
      
      startPolling: (id) => {
        if (pollingInterval) clearInterval(pollingInterval);
        
        set({ taskId: id, status: 'queued', error: null });
        
        const poll = async () => {
          try {
            const response = await axios.get(`http://localhost:8000/api/v1/youtube/tasks/${id}`);
            const data = response.data;
            
            const previousStatus = get().status;
            set({ status: data.status, progressData: data });
            
            if (data.status === 'completed') {
              clearInterval(pollingInterval!);
              if (previousStatus !== 'completed') {
                toast.success("Konversi YouTube selesai!");
              }
            } else if (data.status === 'failed') {
              clearInterval(pollingInterval!);
              set({ error: data.error || 'Proses gagal.' });
              if (previousStatus !== 'failed') {
                toast.error(data.error || 'Proses gagal.');
              }
            }
          } catch (err: any) {
            clearInterval(pollingInterval!);
            set({ status: 'failed', error: 'Gagal menghubungi server.' });
            toast.error('Gagal menghubungi server.');
          }
        };
        
        poll();
        pollingInterval = setInterval(poll, 3000);
      },
      
      stopPolling: () => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      },
      
      reset: () => {
        get().stopPolling();
        set({ taskId: null, status: 'idle', progressData: null, error: null });
      }
    }),
    {
      name: 'youtube-downloader-storage',
      partialize: (state) => ({ 
        taskId: state.taskId, 
        status: state.status, 
        progressData: state.progressData 
      }),
    }
  )
)
