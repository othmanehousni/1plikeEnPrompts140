import { EDThread, EDThreadResponse, EDThreadResponseSchema } from "./types/edSchemas";
import { threads, answers } from "./db/schema";

export class EDClient {
    private readonly apiKey: string;
    private readonly baseUrl: string = "https://eu.edstem.org/api/";
    private token: string | null = null;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async renew_token() {
        const response = await fetch(`${this.baseUrl}renew_token`, {
            method: 'POST',
            headers: {
                'origin': 'https://edstem.org',
                'x-token': this.apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to renew token: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        this.token = data.token;
        return this.token;
    }

    // Method to get a valid token, renewing if necessary
    public async getToken(): Promise<string> {
        if (!this.token) {
            await this.renew_token();
        }
        return this.token as string;
    }

    // Récupère un thread avec validation Zod
    public async getMessage(thread_id: string): Promise<typeof threads.$inferInsert> {
        const response = await fetch(`${this.baseUrl}threads/${thread_id}?view=1`, {
            headers: {
                'origin': 'https://edstem.org',
                'x-token': this.apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get message: ${response.status} ${response.statusText}`);
        }

        const rawData = await response.json();
        
        try {
            const parsedData = EDThreadResponseSchema.parse(rawData);
            return this.convertToDBThread(parsedData.thread);
        } catch (error) {
            console.error("ED API response validation error:", error);
            return rawData.thread as typeof threads.$inferInsert;
        }
    }

    public convertToDBThread(edThread: EDThread): typeof threads.$inferInsert {
        return {
            id: edThread.id,
            courseId: edThread.course_id,
            title: edThread.title,
            message: edThread.document,
            category: edThread.category,
            subcategory: edThread.subcategory || '',
            subsubcategory: edThread.subsubcategory || '',
            isAnswered: edThread.is_answered,
            isStaffAnswered: edThread.is_staff_answered,
            isStudentAnswered: edThread.is_student_answered,
            createdAt: new Date(edThread.created_at),
            updatedAt: edThread.updated_at ? new Date(edThread.updated_at) : null,
            images: edThread.content ? this.extractImageUrls(edThread.content) : [],
        };
    }

    private extractImageUrls(content: string): string[] {
        const imageUrls: string[] = [];
        const imgRegex = /<image src="([^"]+)"/g;
            let match;
            while ((match = imgRegex.exec(content)) !== null) {
                imageUrls.push(match[1]);
            }
        return imageUrls;
    }

    public convertToDBAnswer(edAnswer: any, threadId: number): Omit<typeof answers.$inferInsert, "id"> {
        return {
            threadId,
            courseId: edAnswer.course_id,
            parentId: edAnswer.parent_id,
            message: edAnswer.document,
            isResolved: edAnswer.is_resolved,
            createdAt: new Date(edAnswer.created_at),
            updatedAt: edAnswer.updated_at ? new Date(edAnswer.updated_at) : null,
            images: edAnswer.content ? this.extractImageUrls(edAnswer.content) : []
        };
    }
}