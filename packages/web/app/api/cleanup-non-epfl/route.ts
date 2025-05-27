import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { user } from '@/lib/db/auth'
import { eq, not, like } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    console.log('[CLEANUP] Starting cleanup of non-EPFL users...')
    
    // Find all non-EPFL users
    const nonEpflUsers = await db.select().from(user).where(not(like(user.email, '%@epfl.ch')))
    
    console.log(`[CLEANUP] Found ${nonEpflUsers.length} non-EPFL users:`, nonEpflUsers.map(u => u.email))
    
    if (nonEpflUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No non-EPFL users found to cleanup',
        deletedCount: 0
      })
    }
    
    // Delete all non-EPFL users
    const deletePromises = nonEpflUsers.map(u => 
      db.delete(user).where(eq(user.id, u.id))
    )
    
    await Promise.all(deletePromises)
    
    const deletedEmails = nonEpflUsers.map(u => u.email)
    
    console.log(`[CLEANUP] Successfully deleted ${deletedEmails.length} non-EPFL users:`, deletedEmails)
    
    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${deletedEmails.length} non-EPFL users`,
      deletedUsers: deletedEmails,
      deletedCount: deletedEmails.length
    })
    
  } catch (error) {
    console.error('[CLEANUP] Error during cleanup:', error)
    return NextResponse.json(
      { 
        error: 'Failed to cleanup non-EPFL users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 