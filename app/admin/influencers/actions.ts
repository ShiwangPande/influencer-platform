"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users, influencerProfiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function ToggleInfluencerVerificationAction(influencerId: number, isVerified: boolean) {
  const { userId: adminId } = auth()

  if (!adminId) {
    throw new Error("Unauthorized")
  }

  // Check if admin
  const admin = await db.query.users.findFirst({
    where: eq(users.id, adminId),
  })

  if (!admin || admin.role !== "admin") {
    throw new Error("Unauthorized")
  }

  // Update influencer verification status
  await db
    .update(influencerProfiles)
    .set({
      isVerified,
      updatedAt: new Date(),
    })
    .where(eq(influencerProfiles.id, influencerId))

  revalidatePath("/admin/influencers")
}

export async function ToggleInfluencerStatusAction(influencerId: number, isActive: boolean) {
  const { userId: adminId } = auth()

  if (!adminId) {
    throw new Error("Unauthorized")
  }

  // Check if admin
  const admin = await db.query.users.findFirst({
    where: eq(users.id, adminId),
  })

  if (!admin || admin.role !== "admin") {
    throw new Error("Unauthorized")
  }

  // Update influencer active status
  await db
    .update(influencerProfiles)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(influencerProfiles.id, influencerId))

  revalidatePath("/admin/influencers")
}
