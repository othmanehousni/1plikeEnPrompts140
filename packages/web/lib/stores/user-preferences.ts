import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserPreferences = {
  edStemApiKey: string | null
  setEdStemApiKey: (apiKey: string) => void
  clearEdStemApiKey: () => void
  hasEdStemApiKey: () => boolean

  userName?: string
  theme?: "light" | "dark" | "system"
  
  // Auth state
  isAuthenticated: boolean
  userEmail: string | null
  setAuthState: (isAuthenticated: boolean, userEmail?: string | null) => void
  clearAuthState: () => void
}

export const useUserPreferences = create<UserPreferences>()(
  persist(
    (set, get) => ({
      edStemApiKey: null,
      isAuthenticated: false,
      userEmail: null,
      
      setEdStemApiKey: (apiKey: string) => {
        set({ edStemApiKey: apiKey })
      },
      
      clearEdStemApiKey: () => {
        set({ edStemApiKey: null })
      },
      
      hasEdStemApiKey: () => {
        return !!get().edStemApiKey
      },
      
      setAuthState: (isAuthenticated: boolean, userEmail?: string | null) => {
        set({ isAuthenticated, userEmail: userEmail || null })
      },
      
      clearAuthState: () => {
        set({ isAuthenticated: false, userEmail: null })
      }
    }),
    {
      name: 'user-preferences',
    }
  )
) 