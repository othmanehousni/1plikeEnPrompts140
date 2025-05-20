import {
    EDThreadResponseSchema, 
    type EDThread,
    type EDAnswer,
    EDUserApiResponseSchema, 
    type EDUserApiResponse,
    EDCoursesApiResponseSchema, 
    type EDCoursesApiResponse,
    EDThreadsListResponseSchema, 
    type EDThreadsListResponse,
    type EDListedThread,
    type EDListedAnswer,
    EDCourse,
} from '@/types/schema/ed.schema';
import type { threads } from '@/lib/db/schema';
import { z } from 'zod';


/**
 * Class that provides a way to interact with the ED API.
 * The token should come from the extension.
 */
export class EDClient {
    private readonly apiKey: string;
    private readonly baseUrl: string = "https://eu.edstem.org/api/";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Helper method to handle rate limiting with automatic retries
     */
    private async withRateLimitRetry<T>(operation: () => Promise<T>, retries = 3, delay = 5000): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (retries > 0 && error instanceof Error) {
                // Check for rate limit error patterns
                const isRateLimit = 
                    (error.message && error.message.includes('429')) || 
                    (error.message && error.message.includes('Too Many Requests')) ||
                    (error.message && error.message.includes('rate_limit'));
                    
                if (isRateLimit) {
                    console.log(`[ED-CLIENT.ts] ⏱️ Rate limit hit, waiting ${delay/1000} seconds before retry (${retries} left)...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.withRateLimitRetry(operation, retries - 1, delay * 1.5); // Exponential backoff
                }
            }
            // If it's not a rate limit error or we've exhausted retries, rethrow
            throw error;
        }
    }

    /**
     * Perform a fetch request with rate limit retry protection
     */
    private async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
        return this.withRateLimitRetry(async () => {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'origin': 'https://eu.edstem.org',
                    'x-token': this.apiKey,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; AskEd/1.0)',
                    ...(options.headers || {})
                }
            });
            
            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[ED-CLIENT.ts] API request failed: ${response.status} ${response.statusText}`, errorBody);
                throw new Error(`[ED-CLIENT.ts] API request failed: ${response.status} ${response.statusText}. Details: ${errorBody}`);
            }
            
            return response;
        });
    }

    /**
     * Get the active courses the user is enrolled in.
     * @returns an array, containing the active courses.
     */
    public async getCourses(): Promise<EDCourse[]> {
        console.log("Fetching user info from /api/user...");
        
        const response = await this.fetchWithRetry(`${this.baseUrl}user`);
        const rawData: EDUserApiResponse = await response.json();
        
       // console.log("Received user info data, attempting to parse with Zod:", rawData);
        return rawData.courses.map(course => course.course).filter(this.isCourseActive);
    }

    private isCourseActive(course: EDCourse): boolean {
        const now = new Date();
        const courseYear = course.year;
        const nowYear: number = now.getFullYear();
        return courseYear === nowYear.toString();
    }

    public async getThreadsForCourse(courseId: number, options: { page?: number, limit?: number } = {}): Promise<EDListedThread[]> {
        console.log(`[ED-CLIENT.ts] Fetching threads for course ${courseId}...`);
        
        const limit = options.limit || 30;
        let page = options.page || 0;
        let hasMorePages = true;
        let allThreads: EDListedThread[] = [];
        
        try {
            while (hasMorePages) {
                console.log(`[ED-CLIENT.ts] Fetching page ${page} of threads for course ${courseId}...`);
                let url = `${this.baseUrl}courses/${courseId}/threads?&limit=${limit}`;
                let offset = page * 30;
                if (offset > 0) {
                    url += `&offset=${offset}`;
                }
                url += `&sort=new`;
                
                const response = await this.fetchWithRetry(url);
                const rawData: EDThreadsListResponse = await response.json();
                
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
                    console.error(`[ED-CLIENT.ts] Failed to parse threads response for course ${courseId}:`, error);
                    console.log('[ED-CLIENT.ts] Raw response:', rawData);
                    throw new Error(`[ED-CLIENT.ts] Failed to parse threads response: ${error}`);
                }
            }
            
            //console.log(`[ED-CLIENT.ts] Successfully fetched ${allThreads.length} threads for course ${courseId}`);
            return allThreads;
            
        } catch (error) {
            console.error(`[ED-CLIENT.ts] Error fetching threads for course ${courseId}:`, error);
            throw error;
        }
    }
    
    public extractImageUrls(content: string): string[] {
        const imageUrls: string[] = [];
        const imgRegex = /<image src="([^"]+)"/g;
            let match;
            while ((match = imgRegex.exec(content)) !== null) {
                imageUrls.push(match[1]);
            }
        return imageUrls;
    }

    public async fetchThread(threadId: number): Promise<EDThread> {
        //console.log(`[ED-CLIENT.ts] Fetching thread ${threadId}...`);
        
        try {
            const response = await this.fetchWithRetry(`${this.baseUrl}threads/${threadId}`);
            const rawData = await response.json();
            
            try {
                const parsedResponse = EDThreadResponseSchema.parse(rawData);
                const threadResponse: EDThread = parsedResponse.thread;
                
                //console.log(`[ED-CLIENT.ts] Successfully fetched thread ${threadResponse.id} with ${threadResponse.answers.length} answers and ${threadResponse.comments.length} comments.`);
                
                return threadResponse;
                
            } catch (error) {
                console.error(`[ED-CLIENT.ts] Failed to parse thread response for thread ${threadId} using EDThreadResponseSchema:`, error);
                console.log('[ED-CLIENT.ts] Raw response for detailed parse error:', rawData);
                
                if (rawData && typeof rawData === 'object' && 'thread' in rawData) {
                    const threadProperty = (rawData as { thread: unknown }).thread;
                    if (threadProperty && typeof threadProperty === 'object') {
                        console.warn(`[ED-CLIENT.ts] Falling back to lenient parsing for thread ${threadId}.`);
                        return threadProperty as EDThread;
                    }
                }
                
                throw new Error(`[ED-CLIENT.ts] Failed to parse thread response: ${error}. Original data logged.`);
            }
            
        } catch (error) {
            console.error(`[ED-CLIENT.ts] Error fetching thread ${threadId}:`, error);
            throw error;
        }
    }
} 