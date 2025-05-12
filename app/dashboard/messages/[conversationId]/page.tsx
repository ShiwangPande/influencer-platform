import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users, conversations, messages, userCredits, influencerProfiles } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"
import { SendMessageAction } from "./actions"

interface PageProps {
  params: {
    conversationId: string
  }
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = params
  const { userId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Get user with role
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!dbUser) {
    redirect("/dashboard")
  }

  const isInfluencer = dbUser.role === "influencer"

  // Get conversation
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    with: {
      user: true,
      influencer: true,
    },
  })

  if (!conversation) {
    redirect("/dashboard/messages")
  }

  // Check if user is part of this conversation
  if (conversation.userId !== userId && conversation.influencerId !== userId) {
    redirect("/dashboard/messages")
  }

  // Get other user
  const otherUser = isInfluencer ? conversation.user : conversation.influencer

  // Get messages
  const conversationMessages = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [messages.createdAt],
    with: {
      voiceMemos: true,
    },
  })

  // Mark messages as read
  if (conversationMessages.length > 0) {
    const unreadMessages = conversationMessages.filter((message) => !message.isRead && message.senderId !== userId)

    if (unreadMessages.length > 0) {
      await db
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.isRead, false),
            eq(messages.senderId, otherUser.id),
          ),
        )
    }
  }

  // Check if user has enough credits (only for regular users)
  let hasCredits = true
  if (!isInfluencer) {
    const userCreditsData = await db.query.userCredits.findFirst({
      where: eq(userCredits.userId, userId),
    })

    const influencerProfile = await db.query.influencerProfiles.findFirst({
      where: eq(influencerProfiles.userId, conversation.influencerId),
    })

    const messagePrice = influencerProfile?.messagePrice ? Number(influencerProfile.messagePrice) : 5

    hasCredits = (userCreditsData?.balance || 0) >= messagePrice
  }

  // Format messages for the component
  const formattedMessages = conversationMessages.map((message) => ({
    id: message.id,
    content: message.content,
    senderId: message.senderId,
    createdAt: message.createdAt,
    isRead: message.isRead,
    voiceMemo: message.voiceMemos[0] || null,
  }))

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="border-b p-4 flex items-center">
        <div className="h-10 w-10 rounded-full overflow-hidden mr-3">
          <img
            src={otherUser.imageUrl || "/placeholder.svg?height=40&width=40"}
            alt={`${otherUser.firstName} ${otherUser.lastName}`}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <h2 className="font-medium">
            {otherUser.firstName} {otherUser.lastName}
          </h2>
          <p className="text-xs text-muted-foreground">{isInfluencer ? "Fan" : "Influencer"}</p>
        </div>
      </div>

      <MessageList messages={formattedMessages} currentUserId={userId} otherUser={otherUser} />

      <MessageInput
        conversationId={conversationId}
        onSendMessage={SendMessageAction.bind(null, conversationId)}
        isInfluencer={isInfluencer}
        hasCredits={hasCredits}
      />
    </div>
  )
}
