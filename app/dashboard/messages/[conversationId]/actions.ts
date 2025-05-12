"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import {
  users,
  conversations,
  messages,
  voiceMemos,
  userCredits,
  influencerProfiles,
  creditTransactions,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { put } from "@vercel/blob"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function SendMessageAction(conversationId: string, content: string, voiceMemoFile?: File) {
  const { userId } = auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  // Get user with role
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!dbUser) {
    throw new Error("User not found")
  }

  const isInfluencer = dbUser.role === "influencer"

  // Get conversation
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  })

  if (!conversation) {
    throw new Error("Conversation not found")
  }

  // Check if user is part of this conversation
  if (conversation.userId !== userId && conversation.influencerId !== userId) {
    throw new Error("Unauthorized")
  }

  // For regular users, check if they have enough credits
  if (!isInfluencer) {
    const userCreditsData = await db.query.userCredits.findFirst({
      where: eq(userCredits.userId, userId),
    })

    const influencerProfile = await db.query.influencerProfiles.findFirst({
      where: eq(influencerProfiles.userId, conversation.influencerId),
    })

    const messagePrice = influencerProfile?.messagePrice ? Number(influencerProfile.messagePrice) : 5

    const currentBalance = userCreditsData?.balance || 0

    if (currentBalance < messagePrice) {
      throw new Error("Not enough credits")
    }

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
  }

  // Create message
  const newMessage = await db
    .insert(messages)
    .values({
      conversationId,
      senderId: userId,
      content,
      isRead: false,
    })
    .returning()

  // Update conversation last message time
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId))

  // Handle voice memo if provided (only for influencers)
  if (isInfluencer && voiceMemoFile) {
    const filename = `voice-memos/${conversationId}/${newMessage[0].id}.mp3`

    // Upload to Vercel Blob
    const blob = await put(filename, voiceMemoFile, {
      access: "public",
    })

    // Create voice memo record
    await db.insert(voiceMemos).values({
      messageId: newMessage[0].id,
      influencerId: userId,
      fileUrl: blob.url,
      duration: 0, // We would calculate this properly in a real app
      isRead: false,
    })
  }

  // Send email notification
  const recipientId = isInfluencer ? conversation.userId : conversation.influencerId
  const recipient = await db.query.users.findFirst({
    where: eq(users.id, recipientId),
  })

  if (recipient && recipient.email) {
    try {
      await resend.emails.send({
        from: "VoiceConnect <notifications@voiceconnect.com>",
        to: recipient.email,
        subject: `New message from ${dbUser.firstName} ${dbUser.lastName}`,
        text: `You have a new message from ${dbUser.firstName} ${dbUser.lastName}: "${content}"${isInfluencer && voiceMemoFile ? " (includes voice memo)" : ""}. Log in to view and respond.`,
      })
    } catch (error) {
      console.error("Failed to send email notification:", error)
    }
  }

  revalidatePath(`/dashboard/messages/${conversationId}`)
}
