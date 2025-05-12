import { redirect } from "next/navigation"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users, influencerProfiles, userCredits, conversations, messages } from "@/lib/db/schema"
import { eq, desc, count } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, CreditCard, Users, ArrowUpRight } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const { userId } = auth()
  const user = await currentUser()

  if (!userId || !user) {
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
  const isAdmin = dbUser.role === "admin"

  // Get user credits
  const userCreditsData = await db.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  })

  // Get conversation count
  const conversationCount = await db
    .select({ count: count() })
    .from(conversations)
    .where(isInfluencer ? eq(conversations.influencerId, userId) : eq(conversations.userId, userId))

  // Get unread messages count
  const unreadMessagesCount = await db
    .select({ count: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(isInfluencer ? eq(conversations.influencerId, userId) : eq(conversations.userId, userId))
    .where(eq(messages.isRead, false))
    .where(
      isInfluencer ? eq(messages.senderId, conversations.userId) : eq(messages.senderId, conversations.influencerId),
    )

  // Get recent conversations
  const recentConversations = await db.query.conversations.findMany({
    where: isInfluencer ? eq(conversations.influencerId, userId) : eq(conversations.userId, userId),
    orderBy: [desc(conversations.lastMessageAt)],
    limit: 5,
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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        {!isInfluencer && !isAdmin && (
          <Link href="/dashboard/credits/buy">
            <Button>Buy Credits</Button>
          </Link>
        )}
        {isInfluencer && (
          <Link href="/dashboard/settings">
            <Button>Edit Profile</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isInfluencer ? "Total Fans" : "Conversations"}</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversationCount[0]?.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {isInfluencer ? "People who have messaged you" : "Active conversations with influencers"}
            </p>
          </CardContent>
        </Card>

        {!isInfluencer && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userCreditsData?.balance || 0}</div>
              <p className="text-xs text-muted-foreground">Available credits for messaging</p>
            </CardContent>
          </Card>
        )}

        {isInfluencer && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Message Price</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {(
                  await db.query.influencerProfiles.findFirst({
                    where: eq(influencerProfiles.userId, userId),
                  })
                )?.messagePrice || "5.00"}
              </div>
              <p className="text-xs text-muted-foreground">Credits per message</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadMessagesCount[0]?.count || 0}</div>
            <p className="text-xs text-muted-foreground">Messages waiting for your response</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mt-8 mb-4 text-xl font-semibold">Recent Conversations</h2>
      {recentConversations.length > 0 ? (
        <div className="space-y-4">
          {recentConversations.map((conversation) => {
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
                      <span className="text-xs text-muted-foreground">
                        {new Date(conversation.lastMessageAt).toLocaleDateString()}
                      </span>
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
        <div className="text-center py-8">
          <p className="text-muted-foreground">No conversations yet</p>
          {!isInfluencer && (
            <Link href="/influencers">
              <Button variant="outline" className="mt-4">
                Browse Influencers
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
