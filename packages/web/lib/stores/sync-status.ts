import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SyncStatus = {
  lastSyncedAt: string | null
  isSyncing: boolean
  error: string | null
  setLastSyncedAt: (date: string) => void
  setIsSyncing: (status: boolean) => void
  setError: (error: string | null) => void
  resetSyncStatus: () => void
}

export const useSyncStatus = create<SyncStatus>()(
  persist(
    (set) => ({
      lastSyncedAt: null,
      isSyncing: false,
      error: null,

      setLastSyncedAt: (date: string) => {
        set({ lastSyncedAt: date, error: null })
      },
      
      setIsSyncing: (status: boolean) => {
        set({ isSyncing: status })
      },
      
      setError: (error: string | null) => {
        set({ error })
      },
      
      resetSyncStatus: () => {
        set({ lastSyncedAt: null, isSyncing: false, error: null })
      }
    }),
    {
      name: 'edstem-sync-status',
    }
  )
) 