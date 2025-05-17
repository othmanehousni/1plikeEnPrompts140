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

  groqApiKey: string | null
  setGroqApiKey: (apiKey: string) => void
  clearGroqApiKey: () => void
  hasGroqApiKey: () => boolean

  // For passing transcribed text between components
  transcribedText: string | null
  setTranscribedText: (text: string) => void
  clearTranscribedText: () => void
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
      },

      groqApiKey: null,
      
      setGroqApiKey: (apiKey: string) => {
        set({ groqApiKey: apiKey })
      },
      
      clearGroqApiKey: () => {
        set({ groqApiKey: null })
      },
      
      hasGroqApiKey: () => {
        return !!get().groqApiKey
      },

      // Transcribed text state
      transcribedText: null,
      
      setTranscribedText: (text: string) => {
        set({ transcribedText: text })
      },
      
      clearTranscribedText: () => {
        set({ transcribedText: null })
      }
    }),
    {
      name: 'user-preferences',
    }
  )
) 