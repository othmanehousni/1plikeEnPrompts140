import { NextResponse, NextRequest } from "next/server";
import { getLastSyncDate } from "@/lib/db/edstem";
import { validateEpflDomain } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    // Validate EPFL domain before processing request
    const validation = await validateEpflDomain(request);
    if (!validation.isValid) {
      return validation.response!;
    }

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