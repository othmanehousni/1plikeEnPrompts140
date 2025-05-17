import { NextResponse, NextRequest } from 'next/server';
import { EDClient } from '@/lib/ed-client';

export async function GET(request: NextRequest) {
  try {
    // Get the ED API key from request headers
    const edStemApiKey = request.headers.get('x-edstem-api-key');
    
    if (!edStemApiKey) {
      return NextResponse.json(
        { error: 'ED API key not provided in headers' },
        { status: 401 }
      );
    }
    
    // Fetch courses from ED API
    const client = new EDClient(edStemApiKey);
    const courses = await client.getCourses();
    
    // Return courses
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses from ED' },
      { status: 500 }
    );
  }
} 