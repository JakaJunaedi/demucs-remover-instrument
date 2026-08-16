import { create } from 'zustand'
import axios from 'axios'
import { toast } from 'sonner'

type TaskStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed'

interface AppState {
  taskId: string | null;
  status: TaskStatus;
  progressData: any;
  error: string | null;
  setTaskId: (id: string | null) => void;
  startPolling: (id: string) => void;
  stopPolling: () => void;
  reset: () => void;
}

let pollingInterval: NodeJS.Timeout | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  taskId: null,
  status: 'idle',
  progressData: null,
  error: null,
  
  setTaskId: (id) => set({ taskId: id, status: id ? 'queued' : 'idle', error: null }),
  
  startPolling: (id) => {
    if (pollingInterval) clearInterval(pollingInterval);
    
    set({ taskId: id, status: 'queued', error: null });
    
    const poll = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/v1/tasks/${id}`);
        const data = response.data;
        
        set({ status: data.status, progressData: data });
        
        if (data.status === 'completed') {
          clearInterval(pollingInterval!);
          toast.success("Pemisahan audio selesai!");
        } else if (data.status === 'failed') {
          clearInterval(pollingInterval!);
          set({ error: data.error || 'Proses gagal.' });
          toast.error(data.error || 'Proses gagal.');
        }
      } catch (err: any) {
        clearInterval(pollingInterval!);
        set({ status: 'failed', error: 'Gagal menghubungi server.' });
        toast.error('Gagal menghubungi server.');
      }
    };
    
    // Poll immediately, then every 3 seconds
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
}))
