"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users, influencerProfiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function UpdateProfileAction(formData: FormData) {
  const { userId } = auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  // Get user
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!dbUser) {
    throw new Error("User not found")
  }

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const bio = formData.get("bio") as string
  const messagePrice = formData.get("messagePrice") as string

  // Update Clerk user
  await clerkClient.users.updateUser(userId, {
    firstName,
    lastName,
  })

  // Update user in database
  await db
    .update(users)
    .set({
      firstName,
      lastName,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  // Update influencer profile if exists
  if (dbUser.role === "influencer") {
    const influencerProfile = await db.query.influencerProfiles.findFirst({
      where: eq(influencerProfiles.userId, userId),
    })

    if (influencerProfile) {
      await db
        .update(influencerProfiles)
        .set({
          bio,
          messagePrice: messagePrice ? Number.parseFloat(messagePrice) : 5,
          updatedAt: new Date(),
        })
        .where(eq(influencerProfiles.userId, userId))
    }
  }

  revalidatePath("/dashboard/settings")
}

export async function BecomeInfluencerAction(formData: FormData) {
  const { userId } = auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  // Get user
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!dbUser) {
    throw new Error("User not found")
  }

  const bio = formData.get("bio") as string

  // Update user role
  await db
    .update(users)
    .set({
      role: "influencer",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  // Create influencer profile
  await db.insert(influencerProfiles).values({
    userId,
    bio,
    messagePrice: 5, // Default price
    isVerified: false,
    isActive: true,
  })

  revalidatePath("/dashboard")
  redirect("/dashboard")
}
