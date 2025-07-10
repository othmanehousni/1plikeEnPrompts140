# EdStem Sync Strategy - Current Implementation

## Overview

The EdStem sync system is a comprehensive data synchronization solution that fetches course data, discussion threads, and answers from EdStem's API and stores them in a local PostgreSQL database. The system includes optional vector embeddings powered by Together AI for enhanced semantic search capabilities.

## System Architecture

### Database Schema (`packages/web/lib/db/schema.ts`)

The system uses a three-table relational PostgreSQL schema:

```
courses (1:many) threads (1:many) answers
```

#### Tables Structure

**`courses` Table:**
- `id` (integer, primary key) - EdStem course ID
- `code` (text) - Course code (e.g., "CS101")
- `name` (text) - Course name
- `year` (text) - Academic year
- `lastSynced` (timestamp) - Last synchronization time

**`threads` Table:**
- `id` (integer, primary key) - EdStem thread ID
- `courseId` (integer, foreign key) - References courses.id
- `title` (text) - Thread title
- `message` (text) - Thread content/description
- `category`, `subcategory`, `subsubcategory` (text) - Classification
- Boolean flags: `isAnswered`, `isStaffAnswered`, `isStudentAnswered`
- `createdAt`, `updatedAt` (timestamp) - Temporal tracking
- `images` (jsonb) - Array of image URLs
- `embedding` (vector[1024]) - Semantic search vector

**`answers` Table:**
- `id` (integer, primary key) - EdStem answer ID
- `threadId` (integer, foreign key) - References threads.id
- `courseId` (integer, foreign key) - References courses.id
- `parentId` (integer, nullable) - For nested replies
- `message` (text) - Answer content
- `images` (jsonb) - Array of image URLs
- `isResolved` (boolean) - Resolution status
- `createdAt`, `updatedAt` (timestamp) - Temporal tracking
- `embedding` (vector[1024]) - Semantic search vector

### Data Validation Layer (`packages/web/types/schema/ed.schema.ts`)

The system implements comprehensive Zod-based validation with a dual-schema approach:

#### Schema Categories

**Course Schemas:**
- `EDCourseSchema` - Basic course information
- `EDUserApiResponseSchema` - User enrollment data
- `EDCoursesApiResponseSchema` - API response wrapper

**Thread Schemas:**
- `EDThreadSchema` - Detailed thread data (individual fetch)
- `EDListedThreadSchema` - Simplified thread data (list operations)
- `EDThreadsListResponseSchema` - Paginated thread responses

**Answer Schemas:**
- `EDAnswerSchema` - Detailed answer data
- `EDListedAnswerSchema` - Simplified answer data
- `EDAnswersListResponseSchema` - Answer collection responses

#### Validation Philosophy

- **Flexibility**: `.passthrough()` allows unknown API fields
- **Resilience**: Graceful handling of missing/null values
- **Type Safety**: Full TypeScript inference support
- **Dual Purpose**: Separate schemas for list vs. detail operations

### EdStem API Client (`packages/web/lib/ed-client.ts`)

The `EDClient` class provides a robust interface to EdStem's REST API.

#### Core Features

**Authentication & Configuration:**
- Base URL: `https://eu.edstem.org/api/`
- Authentication: `x-token` header with API key
- Custom headers for proper API interaction

**Rate Limiting & Resilience:**
- Automatic retry with exponential backoff
- 3 retry attempts with 5-second initial delay
- Intelligent rate limit detection (429, "Too Many Requests")
- 30-second timeout protection for all requests

#### API Methods

```typescript
class EDClient {
  // Fetch user's enrolled courses (current year only)
  async getCourses(): Promise<EDCourse[]>
  
  // Get paginated threads for a specific course
  async getThreadsForCourse(
    courseId: number, 
    options?: { page?: number, limit?: number }
  ): Promise<EDListedThread[]>
  
  // Fetch detailed thread with all answers and comments
  async fetchThread(threadId: number): Promise<EDThread>
  
  // Extract image URLs from HTML content
  extractImageUrls(content: string): string[]
}
```

**Implementation Details:**
- **Course Filtering**: Automatically filters to current academic year
- **Pagination**: Handles automatic page traversal for complete data sets
- **Error Handling**: Structured error reporting with context
- **Content Parsing**: Regex-based image URL extraction from HTML

### Vector Embeddings (`packages/web/lib/embeddings.ts`)

Optional semantic search functionality powered by Together AI.

#### Configuration

**Model**: `intfloat/multilingual-e5-large-instruct`
- **Dimensions**: 1024
- **Character Limit**: 8192 per text input
- **Language Support**: Multilingual capabilities

#### Text Processing Pipeline

**Thread Text Preparation:**
```typescript
prepareThreadTextForEmbedding(
  title: string,
  message: string | null,
  category?: string | null,
  subcategory?: string | null
): string
```
Combines: Title + Category + Subcategory + Message content

**Answer Text Preparation:**
```typescript
prepareAnswerTextForEmbedding(message: string | null): string
```
Uses: Answer message content directly

**Text Cleaning Process:**
1. Trim whitespace and validate non-empty content
2. Truncate to 8192 characters if needed
3. Remove control characters (`\u0000-\u001F`, `\u007F-\u009F`)
4. Normalize multiple newlines and spaces
5. Remove problematic encoding characters

## Synchronization Strategy

### Main Sync Flow (`packages/web/lib/db/edstem.ts`)

```
syncEdStemCourses(options: EdStemSyncOptions)
├── 1. Initialize EDClient with API key
├── 2. Fetch user courses via client.getCourses()
├── 3. For each enrolled course:
│   ├── 3a. Update/insert course record in database
│   ├── 3b. Call syncThreadsForCourse()
│   │   ├── Fetch threads paginated (30 per page)
│   │   ├── Early termination optimization
│   │   ├── Batch database existence checks
│   │   ├── For each thread:
│   │   │   ├── Compare timestamps for updates
│   │   │   ├── Update/insert thread record
│   │   │   ├── Generate embedding (new threads only)
│   │   │   └── Call syncAnswersForThread()
│   │   │       ├── Fetch detailed thread data
│   │   │       ├── For each answer:
│   │   │       │   ├── Compare timestamps
│   │   │       │   ├── Update/insert answer record
│   │   │       │   └── Generate embedding (new/updated)
│   └── 3c. Update course lastSynced timestamp
└── 4. Return sync statistics and results
```

### Performance Optimizations

#### 1. Early Termination Strategy
When fetching paginated threads, the system checks if any threads on the current page need updates. If an entire page contains only up-to-date threads, the sync terminates early, avoiding unnecessary API calls for older content.

#### 2. Database Batch Operations
- **Existence Caching**: Query all existing threads/answers in batches
- **Memory Mapping**: Use JavaScript Maps for O(1) lookup performance
- **Reduced Queries**: Single query per course instead of per-item checks

#### 3. Conditional Embedding Generation
- **New Threads**: Generate embeddings for all newly discovered threads
- **Updated Answers**: Generate embeddings only when answer content changes
- **Cost Optimization**: Minimizes Together AI API usage and associated costs

#### 4. Timeout & Error Protection
- **API Timeouts**: 30-second limit on EdStem API calls
- **Embedding Timeouts**: 20-second limit on Together AI requests
- **Graceful Degradation**: Continue sync without embeddings on generation failures
- **Individual Isolation**: Single item failures don't stop entire sync

### Update Logic & Decision Making

#### Thread Update Determination
```typescript
// Compare EdStem timestamp with local database timestamp
const needsUpdate = !existingThread || 
  (existingThread.updatedAt && 
   new Date(edThread.updated_at).getTime() > existingThread.updatedAt.getTime());
```

#### Answer Synchronization Triggers
- **Thread Updates**: Sync answers when parent thread is updated
- **New Threads**: Always sync answers for newly discovered threads
- **Optimization**: Skip answer sync for unchanged threads

#### Course Year Filtering
The `isCourseActive()` method automatically filters courses:
```typescript
private isCourseActive(course: EDCourse): boolean {
  const nowYear = new Date().getFullYear();
  return course.year === nowYear.toString();
}
```

## API Endpoints

### 1. Sync Endpoint
**Route**: `POST /api/edstem/sync`

**Request Body:**
```typescript
{
  apiKey: string;              // Required: EdStem API key
  courseId?: number;           // Optional: Sync specific course only
  togetherApiKey?: string;     // Optional: Enable vector embeddings
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;             // Human-readable result summary
  synced: CourseSyncResult[];  // Detailed per-course results
  lastSynced: Date | null;     // Most recent sync timestamp
  embeddings: boolean;         // Whether embeddings were generated
}
```

**Error Responses:**
- `400`: Invalid request data or missing API key
- `401`: Invalid EdStem credentials
- `429`: Rate limit exceeded
- `500`: Internal server error or sync failure

### 2. Courses Endpoint
**Route**: `GET /api/edstem/courses`

**Headers:**
```
x-edstem-api-key: string     // Required: EdStem API key
```

**Response:**
```typescript
{
  courses: EDCourse[];        // User's enrolled courses
}
```

### 3. Last Sync Status
**Route**: `GET /api/edstem/last-sync`

**Response:**
```typescript
{
  success: boolean;
  lastSynced: Date | null;    // Most recent successful sync
}
```

## Error Handling & System Resilience

### Database Error Management
- **Missing Tables**: Graceful handling of uninitialized database (PostgreSQL error code 42P01)
- **Transaction Safety**: Individual item failures don't affect batch operations
- **Connection Pooling**: Managed by Drizzle ORM for optimal performance

### API Error Recovery
- **Rate Limiting**: Exponential backoff with intelligent retry logic
- **Network Timeouts**: Configurable timeouts prevent hanging operations
- **Malformed Responses**: Fallback parsing for unexpected API response formats
- **Authentication Issues**: Clear error messages for invalid credentials

### Operational Monitoring
- **Structured Logging**: Comprehensive logging with performance metrics
- **Debug Support**: Special detailed logging for specific items (e.g., thread #182914)
- **Error Tracking**: Categorized error reporting with actionable information
- **Progress Indicators**: Real-time sync progress and statistics

## Performance Characteristics

### Throughput Metrics
- **Pagination**: 30 threads per API request
- **Concurrent Operations**: Database operations optimized for parallel execution
- **Memory Efficiency**: Streaming approach for large datasets
- **API Efficiency**: Early termination reduces unnecessary requests

### Resource Utilization
- **Database Connections**: Managed connection pooling via Drizzle ORM
- **Memory Management**: Map-based caching with automatic cleanup
- **API Rate Limits**: Intelligent backoff prevents service disruption
- **Embedding Costs**: Strategic generation minimizes Together AI usage

### Scalability Considerations
- **Large Courses**: Handles courses with thousands of threads efficiently
- **Historical Data**: Processes years of accumulated discussion content
- **Concurrent Users**: Thread-safe operations support multiple sync processes
- **Growth Accommodation**: Configurable limits and timeouts for scaling

## Current System Limitations

### 1. Synchronous Processing
- **Single-threaded**: Processes one course at a time sequentially
- **No Parallelization**: Threads and answers processed in series
- **Impact**: Longer sync times for users with many courses

### 2. Embedding Management
- **No Regeneration**: Existing embeddings cannot be updated with new models
- **Version Lock**: Stuck with current Together AI model without migration path
- **Selective Updates**: No bulk embedding regeneration capabilities

### 3. Operational Constraints
- **Manual Triggers**: No automated scheduling or background sync
- **Geographic Lock**: Hardcoded to EU EdStem region (`eu.edstem.org`)
- **Year Filtering**: Automatic exclusion of historical courses (current year only)

### 4. Configuration Limitations
- **Static Timeouts**: Fixed timeout values not configurable per environment
- **Region Hardcoding**: Cannot switch between EdStem regional endpoints
- **Batch Size**: Fixed pagination limits (30 items) not tunable

## Data Flow Summary

### Complete Synchronization Pipeline

1. **Authentication Phase**
   - Validate EdStem API key via test connection
   - Initialize EDClient with authenticated session
   - Optionally validate Together AI credentials

2. **Discovery Phase**
   - Fetch user's complete course enrollment
   - Filter to current academic year courses
   - Apply optional single-course filtering

3. **Course Synchronization**
   - Upsert course records with metadata
   - Update course information and sync timestamps
   - Track sync statistics per course

4. **Thread Synchronization**
   - Paginated fetch with early termination optimization
   - Timestamp-based update detection
   - Batch database operations for efficiency
   - Vector embedding generation for new content

5. **Answer Synchronization**
   - Detailed thread fetch for answer data
   - Nested reply structure preservation
   - Content-based embedding updates
   - Resolution status tracking

6. **Persistence Layer**
   - Atomic database operations with rollback support
   - Foreign key relationship integrity maintenance
   - Temporal tracking for incremental updates
   - Vector storage for semantic search capabilities

7. **Result Aggregation**
   - Comprehensive sync statistics compilation
   - Error categorization and reporting
   - Performance metrics collection
   - Success/failure status determination

The system provides a robust, resilient, and efficient mechanism for maintaining synchronized EdStem data with advanced search capabilities through vector embeddings. 