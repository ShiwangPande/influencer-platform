import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users, influencerProfiles, messages, conversations } from "@/lib/db/schema"
import { eq, and, count } from "drizzle-orm"
import { formatPrice } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, MessageSquare, Users } from "lucide-react"

export default async function EarningsPage() {
  const { userId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Get user with role
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!dbUser || dbUser.role !== "influencer") {
    redirect("/dashboard")
  }

  // Get influencer profile
  const influencerProfile = await db.query.influencerProfiles.findFirst({
    where: eq(influencerProfiles.userId, userId),
  })

  if (!influencerProfile) {
    redirect("/dashboard")
  }

  // Get total messages received
  const totalMessages = await db
    .select({ count: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(eq(conversations.influencerId, userId), eq(messages.senderId, conversations.userId)))

  // Get total fans
  const totalFans = await db
    .select({ count: count() })
    .from(conversations)
    .where(eq(conversations.influencerId, userId))

  // Calculate total earnings (message price * total messages)
  const messagePrice = Number(influencerProfile.messagePrice)
  const totalEarnings = totalMessages[0].count * messagePrice

  // Get recent messages
  const recentMessages = await db.query.messages.findMany({
    where: eq(messages.senderId, userId),
    orderBy: [messages.createdAt],
    limit: 10,
    with: {
      conversation: {
        with: {
          user: true,
        },
      },
    },
  })

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Earnings</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Received</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages[0].count}</div>
            <p className="text-xs text-muted-foreground">Total messages from fans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fans</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFans[0].count}</div>
            <p className="text-xs text-muted-foreground">People who have messaged you</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mb-4">Message Price</h2>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Price</CardTitle>
          <CardDescription>This is how much fans pay to message you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatPrice(influencerProfile.messagePrice)}</div>
          <p className="text-sm text-muted-foreground mt-2">You can change your price in the settings page</p>
        </CardContent>
      </Card>
    </div>
  )
}
