import { NextResponse } from "next/server";
import { getLastSyncDate } from "@/lib/db/edstem";

export async function GET() {
  try {
    const lastSyncDate = await getLastSyncDate();
    
    return NextResponse.json({
      success: true,
      lastSynced: lastSyncDate,
    });
  } catch (error) {
    console.error("Error getting last sync date:", error);
    return NextResponse.json(
      { error: "Failed to get last sync date" },
      { status: 500 }
    );
  }
} 