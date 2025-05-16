import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserPreferences = {
  togetherApiKey: string | null
  setTogetherApiKey: (apiKey: string) => void
  clearTogetherApiKey: () => void
  hasTogetherApiKey: () => boolean
  
  edStemApiKey: string | null
  setEdStemApiKey: (apiKey: string) => void
  clearEdStemApiKey: () => void
  hasEdStemApiKey: () => boolean
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
      },

      edStemApiKey: null,
      
      setEdStemApiKey: (apiKey: string) => {
        set({ edStemApiKey: apiKey })
      },
      
      clearEdStemApiKey: () => {
        set({ edStemApiKey: null })
      },
      
      hasEdStemApiKey: () => {
        return !!get().edStemApiKey
      }
    }),
    {
      name: 'user-preferences',
    }
  )
) 