import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserPreferences = {
  edStemApiKey: string | null
  setEdStemApiKey: (apiKey: string) => void
  clearEdStemApiKey: () => void
  hasEdStemApiKey: () => boolean

  userName?: string
  theme?: "light" | "dark" | "system"
}

export const useUserPreferences = create<UserPreferences>()(
  persist(
    (set, get) => ({
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