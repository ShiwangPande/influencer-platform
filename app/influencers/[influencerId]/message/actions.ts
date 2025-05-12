"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users, conversations, messages, userCredits, influencerProfiles, creditTransactions } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function StartConversationAction(influencerId: string, formData: FormData) {
  const { userId } = auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  const message = formData.get("message") as string

  if (!message || !message.trim()) {
    throw new Error("Message is required")
  }

  // Get influencer
  const influencer = await db.query.users.findFirst({
    where: eq(users.id, influencerId),
  })

  if (!influencer || influencer.role !== "influencer") {
    throw new Error("Influencer not found")
  }

  // Get influencer profile
  const influencerProfile = await db.query.influencerProfiles.findFirst({
    where: eq(influencerProfiles.userId, influencerId),
  })

  if (!influencerProfile) {
    throw new Error("Influencer profile not found")
  }

  // Check if conversation already exists
  const existingConversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.userId, userId), eq(conversations.influencerId, influencerId)),
  })

  // Get user credits
  const userCreditsData = await db.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  })

  const messagePrice = Number(influencerProfile.messagePrice)
  const currentBalance = userCreditsData?.balance || 0

  if (currentBalance < messagePrice) {
    throw new Error("Not enough credits")
  }

  // Create or get conversation
  let conversationId: string

  if (existingConversation) {
    conversationId = existingConversation.id
  } else {
    const newConversation = await db
      .insert(conversations)
      .values({
        userId,
        influencerId,
        lastMessageAt: new Date(),
      })
      .returning()

    conversationId = newConversation[0].id
  }

  // Create message
  await db.insert(messages).values({
    conversationId,
    senderId: userId,
    content: message.trim(),
    isRead: false,
  })

  // Update conversation last message time
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId))

  // Deduct credits
  if (userCreditsData) {
    await db
      .update(userCredits)
      .set({
        balance: currentBalance - messagePrice,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId))

    // Record transaction
    await db.insert(creditTransactions).values({
      userId,
      amount: -messagePrice,
      type: "usage",
    })
  }

  // Send email notification to influencer
  if (influencer.email) {
    try {
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      })

      await resend.emails.send({
        from: "VoiceConnect <notifications@voiceconnect.com>",
        to: influencer.email,
        subject: `New message from ${currentUser?.firstName} ${currentUser?.lastName}`,
        text: `You have a new message from ${currentUser?.firstName} ${currentUser?.lastName}: "${message.trim()}". Log in to view and respond.`,
      })
    } catch (error) {
      console.error("Failed to send email notification:", error)
    }
  }

  revalidatePath("/dashboard/messages")
  redirect(`/dashboard/messages/${conversationId}`)
}
