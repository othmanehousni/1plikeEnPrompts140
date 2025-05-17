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
    // Clean and prepare the text
    const cleanText = text.trim();
    if (!cleanText) return null;

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
    return result.embeddings[0];
  } catch (error) {
    console.error('Error generating embeddings:', error);
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