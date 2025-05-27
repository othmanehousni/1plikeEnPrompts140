import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { user, session, account } from '@/lib/db/auth'
import { eq } from 'drizzle-orm'

export async function DELETE(req: NextRequest) {
  try {
    const { userId, email } = await req.json()
    
    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Either userId or email is required' },
        { status: 400 }
      )
    }
    
    console.log(`Deleting user account: ${email || userId}`)
    
    // Find user by userId or email
    const userToDelete = userId 
      ? await db.select().from(user).where(eq(user.id, userId)).limit(1)
      : await db.select().from(user).where(eq(user.email, email)).limit(1)
    
    if (userToDelete.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    const userRecord = userToDelete[0]
    
    // Delete user (cascade deletes will handle sessions and accounts)
    await db.delete(user).where(eq(user.id, userRecord.id))
    
    console.log(`Successfully deleted user: ${userRecord.email} (ID: ${userRecord.id})`)
    
    return NextResponse.json({
      success: true,
      message: 'User account deleted successfully',
      deletedUser: {
        id: userRecord.id,
        email: userRecord.email
      }
    })
    
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user account' },
      { status: 500 }
    )
  }
} 