import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserPreferences = {
  togetherApiKey: string | null
  setTogetherApiKey: (apiKey: string) => void
  clearTogetherApiKey: () => void
  hasTogetherApiKey: () => boolean
}

export const useUserPreferences = create<UserPreferences>()(
  persist(
    (set, get) => ({
      togetherApiKey: null,
      
      setTogetherApiKey: (apiKey: string) => {
        set({ togetherApiKey: apiKey })
      },
      
      clearTogetherApiKey: () => {
        set({ togetherApiKey: null })
      },
      
      hasTogetherApiKey: () => {
        return !!get().togetherApiKey
      }
    }),
    {
      name: 'user-preferences',
    }
  )
) 