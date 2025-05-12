"use client"

import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users, influencerProfiles, userCredits, conversations } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { formatPrice } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StartConversationAction } from "./actions"

interface PageProps {
  params: {
    influencerId: string
  }
}

export default async function MessageInfluencerPage({ params }: PageProps) {
  const { influencerId } = params
  const { userId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Get influencer
  const influencer = await db.query.users.findFirst({
    where: eq(users.id, influencerId),
  })

  if (!influencer || influencer.role !== "influencer") {
    redirect("/influencers")
  }

  // Get influencer profile
  const influencerProfile = await db.query.influencerProfiles.findFirst({
    where: eq(influencerProfiles.userId, influencerId),
  })

  if (!influencerProfile) {
    redirect("/influencers")
  }

  // Check if conversation already exists
  const existingConversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.userId, userId), eq(conversations.influencerId, influencerId)),
  })

  if (existingConversation) {
    redirect(`/dashboard/messages/${existingConversation.id}`)
  }

  // Get user credits
  const userCreditsData = await db.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  })

  const messagePrice = Number(influencerProfile.messagePrice)
  const hasEnoughCredits = (userCreditsData?.balance || 0) >= messagePrice

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            Message {influencer.firstName} {influencer.lastName}
          </CardTitle>
          <CardDescription>Send a message to start a conversation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6">
            <div className="h-16 w-16 rounded-full overflow-hidden mr-4">
              <img
                src={influencer.imageUrl || "/placeholder.svg?height=64&width=64"}
                alt={`${influencer.firstName} ${influencer.lastName}`}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {influencer.firstName} {influencer.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">{formatPrice(influencerProfile.messagePrice)} per message</p>
            </div>
          </div>

          {!hasEnoughCredits && (
            <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-md mb-4">
              <p className="text-sm">
                You don't have enough credits to message this influencer. Each message costs{" "}
                {formatPrice(influencerProfile.messagePrice)}.
              </p>
              <Button variant="link" className="p-0 h-auto text-sm" onClick={() => redirect("/dashboard/credits/buy")}>
                Buy credits
              </Button>
            </div>
          )}

          <form action={StartConversationAction.bind(null, influencerId)}>
            <Textarea
              name="message"
              placeholder="Type your message here..."
              className="min-h-[120px]"
              disabled={!hasEnoughCredits}
              required
            />
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => redirect("/influencers")}>
            Cancel
          </Button>
          <Button type="submit" form="start-conversation-form" disabled={!hasEnoughCredits}>
            Send Message
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
