import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users, conversations, messages } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MessageSquare, ArrowUpRight } from "lucide-react"

export default async function MessagesPage() {
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

  // Get all conversations
  const allConversations = await db.query.conversations.findMany({
    where: isInfluencer ? eq(conversations.influencerId, userId) : eq(conversations.userId, userId),
    orderBy: [desc(conversations.lastMessageAt)],
    with: {
      user: true,
      influencer: true,
      messages: {
        limit: 1,
        orderBy: [desc(messages.createdAt)],
      },
    },
  })

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        {!isInfluencer && (
          <Link href="/influencers">
            <Button>Find Influencers</Button>
          </Link>
        )}
      </div>

      {allConversations.length > 0 ? (
        <div className="space-y-4">
          {allConversations.map((conversation) => {
            const otherUser = isInfluencer ? conversation.user : conversation.influencer
            const lastMessage = conversation.messages[0]

            return (
              <Link key={conversation.id} href={`/dashboard/messages/${conversation.id}`}>
                <div className="flex items-center p-4 rounded-lg border hover:bg-accent transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gray-200 mr-4 overflow-hidden">
                    <img
                      src={otherUser.imageUrl || "/placeholder.svg?height=40&width=40"}
                      alt={`${otherUser.firstName} ${otherUser.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-medium truncate">
                        {otherUser.firstName} {otherUser.lastName}
                      </h3>
                      <span className="text-xs text-muted-foreground">{formatDate(conversation.lastMessageAt)}</span>
                    </div>
                    {lastMessage && <p className="text-sm text-muted-foreground truncate">{lastMessage.content}</p>}
                  </div>
                  <ArrowUpRight className="ml-2 h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No messages yet</h2>
          <p className="text-muted-foreground mb-6">
            {isInfluencer ? "You haven't received any messages yet." : "Start a conversation with an influencer."}
          </p>
          {!isInfluencer && (
            <Link href="/influencers">
              <Button>Browse Influencers</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
