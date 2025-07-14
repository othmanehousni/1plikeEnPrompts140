import { openai } from "@ai-sdk/openai";
import type { modelID } from "../providers";
import { searchEdCourse, getThreadDetails } from "../tools";

export const CHAT_AGENT_INSTRUCTIONS = `You are AskED, a helpful AI assistant for EPFL students and educators.

**Your Role:**
- Assist EPFL students and educators with academic questions
- Provide clear, accurate, and helpful responses
- Maintain context across conversations
- Be encouraging and supportive in your interactions

**Capabilities:**
- Answer questions about academic concepts and topics
- Help with problem-solving and learning
- Provide explanations and clarifications
- Search through EdStem course content when needed

**Guidelines:**
- Always be respectful and professional
- Acknowledge when you don't know something
- Ask clarifying questions when needed
- Provide step-by-step explanations for complex topics
- Use the search tool when users ask about course-specific content`;

// Dynamic instructions that include user's available courses
export function createChatAgentInstructions(userCourses: Array<{id: number, code: string, name: string}> = []) {
  const coursesContext = userCourses.length > 0 
    ? `\n\n**Available Courses:**\nYou have access to the following EPFL courses for searching and answering questions:\n${userCourses.map(course => `- Course ID: ${course.id}, Code: ${course.code}, Name: ${course.name}`).join('\n')}\n\nWhen a user asks about course content, use the searchEdCourse tool with the appropriate course ID. If the user doesn't specify a course, ask them to clarify which course they're referring to.`
    : `\n\n**No Course Access:**\nNo courses are currently available for search. You can still help with general academic questions.`;

  return CHAT_AGENT_INSTRUCTIONS + coursesContext + `\n\n**RAG Instructions:**
1. When users ask course-specific questions, first use searchEdCourse to find relevant content
2. Always specify the correct courseId from the available courses above
3. Use the search results to provide accurate, contextual answers
4. Reference the thread IDs and URLs in your responses so users can find the original discussions
5. If you need more detailed content, use getThreadDetails with the relevant thread IDs
6. Always cite your sources by mentioning the thread titles and providing EdStem URLs`;
}

export function createChatAgent() {
  return {
    name: "AskED Assistant",
    instructions: CHAT_AGENT_INSTRUCTIONS,
    model: openai("gpt-4o-mini"),
    tools: {
      searchEdCourse,
      getThreadDetails,
    },
  };
}

// Helper function to create agent with specific model (for model selection)
export function createChatAgentWithModel(modelId: modelID = "gpt-4.1", userCourses: Array<{id: number, code: string, name: string}> = []) {
  return {
    name: "AskED Assistant",
    instructions: createChatAgentInstructions(userCourses),
    model: openai(modelId),
    tools: {
      searchEdCourse,
      getThreadDetails,
    },
  };
} 