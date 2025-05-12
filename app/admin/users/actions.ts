"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users, influencerProfiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function UpdateUserRoleAction(userId: string, role: "user" | "influencer" | "admin") {
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

  // Update user role
  await db
    .update(users)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  // If making user an influencer, create influencer profile if it doesn't exist
  if (role === "influencer") {
    const existingProfile = await db.query.influencerProfiles.findFirst({
      where: eq(influencerProfiles.userId, userId),
    })

    if (!existingProfile) {
      await db.insert(influencerProfiles).values({
        userId,
        bio: "No bio yet",
        messagePrice: 5, // Default price
        isVerified: true, // Admin-created influencers are verified by default
        isActive: true,
      })
    }
  }

  revalidatePath("/admin/users")
}
