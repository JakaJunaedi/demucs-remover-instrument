import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import { toast } from 'sonner'

type TaskStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed' | 'paused'

interface AppState {
  taskId: string | null;
  status: TaskStatus;
  progressData: any;
  error: string | null;
  setTaskId: (id: string | null) => void;
  startPolling: (id: string) => void;
  stopPolling: () => void;
  pauseTask: () => Promise<void>;
  resumeTask: () => Promise<void>;
  cancelTask: () => Promise<void>;
  reset: () => void;
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      taskId: null,
      status: 'idle',
      progressData: null,
      error: null,
      
      setTaskId: (id) => set({ taskId: id, status: id ? 'queued' : 'idle', error: null }),
      
      startPolling: (id) => {
        if (pollingInterval) clearInterval(pollingInterval);
        
        const currentStatus = get().status;
        if (currentStatus !== 'processing' && currentStatus !== 'completed') {
          set({ taskId: id, status: 'queued', error: null });
        } else {
          set({ taskId: id, error: null });
        }
        
        const poll = async () => {
          try {
            const response = await axios.get(`http://localhost:8000/api/v1/tasks/${id}`);
            const data = response.data;
            
            const previousStatus = get().status;
            set({ status: data.status, progressData: data });
            
            if (data.status === 'completed') {
              clearInterval(pollingInterval!);
              if (previousStatus !== 'completed') {
                toast.success("Pemisahan audio selesai!");
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
      
      pauseTask: async () => {
        const id = get().taskId;
        if (!id) return;
        try {
          await axios.post(`http://localhost:8000/api/v1/tasks/${id}/pause`);
          get().stopPolling();
          set({ status: 'paused' });
          toast.info("Tugas di-pause.");
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Gagal mem-pause tugas.");
        }
      },
      
      resumeTask: async () => {
        const id = get().taskId;
        if (!id) return;
        try {
          await axios.post(`http://localhost:8000/api/v1/tasks/${id}/resume`);
          set({ status: 'processing' });
          get().startPolling(id);
          toast.success("Tugas dilanjutkan.");
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Gagal melanjutkan tugas.");
        }
      },
      
      cancelTask: async () => {
        const id = get().taskId;
        if (!id) return;
        try {
          await axios.post(`http://localhost:8000/api/v1/tasks/${id}/cancel`);
          get().stopPolling();
          set({ status: 'failed', error: "Proses dibatalkan oleh pengguna." });
          toast.error("Tugas dibatalkan.");
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Gagal membatalkan tugas.");
        }
      },
      
      reset: () => {
        get().stopPolling();
        set({ taskId: null, status: 'idle', progressData: null, error: null });
      }
    }),
    {
      name: 'vocal-remover-storage',
      partialize: (state) => ({ 
        taskId: state.taskId, 
        status: state.status, 
        progressData: state.progressData 
      }),
    }
  )
)
