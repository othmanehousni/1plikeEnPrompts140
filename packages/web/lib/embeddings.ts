import { createTogetherAI } from '@ai-sdk/togetherai';

/**
 * Generates embeddings for text using the Together AI Multilingual e5-large-instruct model
 * 
 * @param text - The text to generate embeddings for
 * @param apiKey - The Together AI API key
 * @returns An array of numbers representing the embedding vector
 */
export async function generateEmbeddings(text: string, apiKey: string): Promise<number[] | null> {
  if (!text || !apiKey) return null;
  
  try {
    // Clean and prepare the text - extensive cleaning to prevent API errors
    let cleanText = text.trim();
    if (!cleanText) return null;
    
    // Limiter la taille du texte (Together AI a généralement une limite de tokens)
    if (cleanText.length > 8192) {
      console.log(`[EMBEDDINGS] ✂️ Text truncated from ${cleanText.length} to 8192 characters`);
      cleanText = cleanText.substring(0, 8192);
    }
    
    // Nettoyer le texte de caractères problématiques
    cleanText = cleanText
      // Enlever les caractères de contrôle et non-imprimables
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // Remplacer les séquences de sauts de ligne multiples par un seul
      .replace(/\n{3,}/g, '\n\n')
      // Normaliser les espaces multiples
      .replace(/\s{2,}/g, ' ')
      // Enlever tout caractère qui pourrait causer des erreurs d'encodage
      .replace(/[^\p{L}\p{N}\p{P}\p{Z}\p{S}]/gu, '');
    
    // Vérifier si le texte n'est pas vide après nettoyage
    if (!cleanText.trim()) {
      console.warn('[EMBEDDINGS] ⚠️ Text became empty after cleaning');
      return null;
    }

    // Create the Together AI provider with the API key
    const togetherAI = createTogetherAI({
      apiKey: apiKey,
    });

    // Create the embedding model
    const embeddingModel = togetherAI.textEmbeddingModel('intfloat/multilingual-e5-large-instruct');
    
    // Generate the embedding using the correct method with proper parameters
    const result = await embeddingModel.doEmbed({
      values: [cleanText]
    });
    
    // Return the first embedding from the result
    if (result?.embeddings?.[0]) {
      return result.embeddings[0];
    } else {
      console.warn('[EMBEDDINGS] ⚠️ Empty embedding result returned');
      return null;
    }
  } catch (error) {
    console.error('Error generating embeddings:', error);
    // Log des détails spécifiques pour les erreurs API
    if (error && typeof error === 'object' && 'responseBody' in error) {
      try {
        console.error('[EMBEDDINGS] 🔍 API error details:', 
          typeof error.responseBody === 'string' 
            ? JSON.parse(error.responseBody) 
            : error.responseBody
        );
      } catch (parseError) {
        console.error('[EMBEDDINGS] 🔍 Raw API error:', error.responseBody);
      }
    }
    return null;
  }
}

/**
 * Prepares text for embedding by combining relevant fields from an Ed thread
 * 
 * @param title - Thread title
 * @param message - Thread message content
 * @param category - Thread category
 * @param subcategory - Thread subcategory
 * @returns Formatted text for embedding
 */
export function prepareThreadTextForEmbedding(
  title: string,
  message: string | null,
  category?: string | null,
  subcategory?: string | null
): string {
  const parts = [
    title ? `Title: ${title}` : '',
    category ? `Category: ${category}` : '',
    subcategory ? `Subcategory: ${subcategory}` : '',
    message || ''
  ];
  
  return parts.filter(Boolean).join('\n');
}

/**
 * Prepares text for embedding from an answer
 * 
 * @param message - Answer content
 * @returns Formatted text for embedding
 */
export function prepareAnswerTextForEmbedding(message: string | null): string {
  return message || '';
} 