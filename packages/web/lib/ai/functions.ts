export interface ThreadResult {
  id: number;
  title: string;
  message: string | null;
  category: string | null;
  subcategory: string | null;
  courseId: number;
  createdAt: string;
  score: number;
}

export interface AnswerResult {
  id: number;
  message: string | null;
  threadId: number;
  courseId: number;
  createdAt: string;
  score: number;
}

export interface SearchResult {
  success: boolean;
  threads?: ThreadResult[];
  answers?: AnswerResult[];
  query: string;
  error?: string;
}

/**
 * AI Function: Search Ed content using vector embeddings
 * This function allows the LLM to search through ED content semantically by utilizing vector embeddings
 */
export async function searchEdContent({
  query,
  courseId,
  togetherApiKey,
  limit = 5
}: {
  query: string;
  courseId?: number;
  togetherApiKey: string;
  limit?: number;
}): Promise<SearchResult> {
  try {
    const response = await fetch('/api/ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        courseId,
        togetherApiKey,
        limit
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to search ED content');
    }

    const results = await response.json();
    return {
      success: true,
      threads: results.threads || [],
      answers: results.answers || [],
      query
    };
  } catch (error) {
    console.error('Error searching ED content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      query
    };
  }
}

/**
 * Format the search results into a readable text for the AI
 */
export function formatSearchResults(results: SearchResult): string {
  if (!results.success) {
    return `Error searching: ${results.error}`;
  }

  const { threads = [], answers = [] } = results;
  let formattedText = `Search results for: "${results.query}"\n\n`;

  if (threads.length === 0 && answers.length === 0) {
    return `${formattedText}No results found.`;
  }

  if (threads.length > 0) {
    formattedText += "## Threads\n\n";
    threads.forEach((thread: ThreadResult, index: number) => {
      formattedText += `### ${index + 1}. ${thread.title}\n`;
      if (thread.category) formattedText += `Category: ${thread.category}\n`;
      if (thread.subcategory) formattedText += `Subcategory: ${thread.subcategory}\n`;
      if (thread.message) formattedText += `${thread.message.substring(0, 300)}${thread.message.length > 300 ? '...' : ''}\n`;
      formattedText += `Thread ID: ${thread.id}, Similarity Score: ${(thread.score * 100).toFixed(2)}%\n\n`;
    });
  }

  if (answers.length > 0) {
    formattedText += "## Answers\n\n";
    answers.forEach((answer: AnswerResult, index: number) => {
      formattedText += `### ${index + 1}. Answer in Thread #${answer.threadId}\n`;
      if (answer.message) formattedText += `${answer.message.substring(0, 300)}${answer.message.length > 300 ? '...' : ''}\n`;
      formattedText += `Answer ID: ${answer.id}, Similarity Score: ${(answer.score * 100).toFixed(2)}%\n\n`;
    });
  }

  return formattedText;
} 