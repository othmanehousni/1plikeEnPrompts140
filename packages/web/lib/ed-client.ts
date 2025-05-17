import {
    EDThreadResponseSchema, 
    type EDThread, // This is the detailed thread type
    type EDAnswer, // This is the detailed answer type
    EDUserApiResponseSchema, 
    type EDUserApiResponse,
    EDCoursesApiResponseSchema, 
    type EDCoursesApiResponse,
    EDThreadsListResponseSchema, 
    type EDThreadsListResponse,
    type EDListedThread, // Renamed from EdStemThreadObject
    type EDListedAnswer,
    EDCourse, // Renamed from EdStemAnswerObject
    // EDAnswerSchema is available if specific parsing of one answer is needed outside of EDThreadResponseSchema
    // EDCourseSchema is also available if needed directly
} from '@/types/schema/ed.schema';
import type { threads } from '@/lib/db/schema'; // This is for DB schema, not API schema
import { z } from 'zod';

// All EdStem API Schemas and related types are now in ed.schema.ts
// Local definitions like EdStemCourseInfoSchema, EdStemCoursesApiResponseSchema, etc., are removed.
// EdStemThreadObject and EdStemAnswerObject types are replaced by EDListedThread and EDListedAnswer.

export class EDClient {
    private readonly apiKey: string; // This is the user's long-lived API key
    private readonly baseUrl: string = "https://eu.edstem.org/api/";
    private currentToken: string | null = null;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async renewToken(): Promise<string> {
        console.log("Attempting to renew EdStem token...");
        const response = await fetch(`${this.baseUrl}renew_token`, {
            method: 'POST',
            headers: {
                'origin': 'https://eu.edstem.org',
                'x-token': this.apiKey,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (compatible; AskEd/1.0)',
            }
        });

        const responseBodyText = await response.text();

        if (!response.ok) {
            console.error(`Failed to renew token: ${response.status} ${response.statusText}`, responseBodyText);
            throw new Error(`Failed to renew token: ${response.status} ${response.statusText}. Details: ${responseBodyText}`);
        }

        let data: unknown;
        try {
            data = JSON.parse(responseBodyText);
        } catch (e) {
            console.error("Failed to parse renew_token JSON response:", responseBodyText);
            throw new Error("Failed to parse JSON from EdStem API renew_token response.");
        }
        
        console.log("Full renew_token response data:", data);

        // Basic check for token, can be enhanced with a Zod schema if response structure is known
        if (typeof data === 'object' && data !== null && 'token' in data && typeof (data as { token: unknown }).token === 'string') {
            this.currentToken = (data as { token: string }).token;
            console.log("EdStem token renewed successfully.");
            return this.currentToken;
        }
        
        console.error("Token not found or invalid in renew_token response object:", data);
        throw new Error("Token not found or invalid in EdStem API response after renewing.");
    }

    public async getToken(): Promise<string> {
        // For now, always renew. Later, could add logic to use currentToken if not expired.
        return this.renewToken();
    }

    public async getUserInfo(token: string): Promise<EDUserApiResponse> {
        console.log("Fetching user info from /api/user...");
        const response = await fetch(`${this.baseUrl}user`, {
            headers: {
                'origin': 'https://eu.edstem.org',
                'x-token': token, 
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (compatible; AskEd/1.0)',
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Failed to get user info: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`Failed to get user info: ${response.status} ${response.statusText}. Details: ${errorBody}`);
        }
        const rawData = await response.json();
        console.log("Received user info data, attempting to parse with Zod:", rawData);
        return EDUserApiResponseSchema.parse(rawData);
    }
    public isCourseActive(course: EDCourse): boolean {
        const now = new Date();
        const courseYear = course.year;
        const nowYear: number = now.getFullYear();
        return courseYear === nowYear.toString();
    }

    public async getCourses(token: string): Promise<EDCoursesApiResponse> {
        console.warn("EDClient.getCourses directly called. Consider using getUserInfo().courses instead for richer course details per user.");
        const response = await fetch(`${this.baseUrl}courses`, {
            headers: {
                'origin': 'https://eu.edstem.org',
                'x-token': token, 
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (compatible; AskEd/1.0)',
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Failed to get courses: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`Failed to get courses: ${response.status} ${response.statusText}. Details: ${errorBody}`);
        }
        const rawData = await response.json();
        return EDCoursesApiResponseSchema.parse(rawData); // Validate with Zod from ed.schema.ts
    }

    public async getThreadsForCourse(token: string, courseId: number, options: { page?: number, limit?: number } = {}): Promise<EDListedThread[]> {
        console.log(`Fetching threads for course ${courseId}...`);
        
        const limit = options.limit || 50;
        let page = options.page || 1;
        let hasMorePages = true;
        let allThreads: EDListedThread[] = [];
        
        try {
            while (hasMorePages) {
                console.log(`Fetching page ${page} of threads for course ${courseId}...`);
                
                const response = await fetch(`${this.baseUrl}courses/${courseId}/threads?page=${page}&limit=${limit}`, {
                    headers: {
                        'origin': 'https://eu.edstem.org',
                        'x-token': token,
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (compatible; AskEd/1.0)',
                    }
                });
                
                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error(`Failed to get threads for course ${courseId} (page ${page}): ${response.status} ${response.statusText}`, errorBody);
                    throw new Error(`Failed to get threads: ${response.status} ${response.statusText}. Details: ${errorBody}`);
                }
                
                const rawData = await response.json();
                
                try {
                    const parsedData = EDThreadsListResponseSchema.parse(rawData);
                    
                    if (parsedData.threads && parsedData.threads.length > 0) {
                        allThreads = [...allThreads, ...parsedData.threads];
                    }
                    
                    if (parsedData.pagination) {
                        hasMorePages = parsedData.pagination.current_page < parsedData.pagination.last_page;
                        page++;
                    } else {
                        hasMorePages = false;
                    }
                } catch (error) {
                    console.error(`Failed to parse threads response for course ${courseId}:`, error);
                    console.log('Raw response:', rawData);
                    throw new Error(`Failed to parse threads response: ${error}`);
                }
            }
            
            console.log(`Successfully fetched ${allThreads.length} threads for course ${courseId}`);
            return allThreads;
            
        } catch (error) {
            console.error(`Error fetching threads for course ${courseId}:`, error);
            throw error;
        }
    }
    
    public async getAnswersForThread(token: string, threadId: number, options: { page?: number, limit?: number } = {}): Promise<EDListedAnswer[]> {
        console.log(`Fetching answers for thread ${threadId}...`);
        
        try {
            const response = await fetch(`${this.baseUrl}threads/${threadId}`, {
                headers: {
                    'origin': 'https://eu.edstem.org',
                    'x-token': token,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; AskEd/1.0)',
                }
            });
            
            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Failed to get thread ${threadId}: ${response.status} ${response.statusText}`, errorBody);
                throw new Error(`Failed to get thread: ${response.status} ${response.statusText}. Details: ${errorBody}`);
            }
            
            const rawData = await response.json();
            
            try {
                const threadResponse = EDThreadResponseSchema.parse(rawData); // Uses detailed schema
                
                const detailedAnswers: EDAnswer[] = threadResponse.thread.answers || [];
                console.log(`Successfully fetched ${detailedAnswers.length} answers for thread ${threadId} using detailed schema.`);
                
                // Map the detailed EDAnswer to the simpler EDListedAnswer format expected by this method's return type
                return detailedAnswers.map(answer => ({
                    id: answer.id,
                    parent_id: answer.parent_id,
                    message: answer.content || answer.document || null, 
                    images: [], 
                    is_resolved: answer.is_resolved,
                    created_at: answer.created_at,
                    updated_at: answer.updated_at || answer.created_at,
                }));
                
            } catch (error) {
                console.error(`Failed to parse thread response for thread ${threadId} using EDThreadResponseSchema:`, error);
                console.log('Raw response for detailed parse error:', rawData);
                
                if (rawData && typeof rawData === 'object' && 'thread' in rawData) {
                    const threadProperty = (rawData as { thread: unknown }).thread;
                    if (threadProperty && typeof threadProperty === 'object' && 'answers' in threadProperty) {
                        const answersProperty = (threadProperty as { answers: unknown }).answers;
                        if (Array.isArray(answersProperty)) {
                            console.warn(`Falling back to lenient parsing for answers in thread ${threadId}.`);
                            return (answersProperty as Record<string, unknown>[]).map((answer_data: Record<string, unknown>) => ({
                                id: typeof answer_data.id === 'number' ? answer_data.id : 0,
                                parent_id: typeof answer_data.parent_id === 'number' ? answer_data.parent_id : null,
                                message: typeof answer_data.content === 'string' ? answer_data.content :
                                        typeof answer_data.document === 'string' ? answer_data.document : null,
                                images: Array.isArray(answer_data.images) ? answer_data.images : [], 
                                is_resolved: typeof answer_data.is_resolved === 'boolean' ? answer_data.is_resolved : false,
                                created_at: typeof answer_data.created_at === 'string' ? answer_data.created_at : new Date().toISOString(),
                                updated_at: typeof answer_data.updated_at === 'string' ? answer_data.updated_at : 
                                            typeof answer_data.created_at === 'string' ? answer_data.created_at : new Date().toISOString(),
                            }));
                        }
                    }
                }
                
                throw new Error(`Failed to parse thread response and extract answers: ${error}. Original data logged.`);
            }
            
        } catch (error) {
            console.error(`Error fetching answers for thread ${threadId}:`, error);
            throw error;
        }
    }
} 