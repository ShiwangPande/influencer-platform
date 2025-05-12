import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { db } from "@/lib/db"
import { influencerProfiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { formatPrice } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"

export default async function InfluencersPage() {
  const { userId } = auth()

  // Get all influencers
  const influencers = await db.query.influencerProfiles.findMany({
    where: eq(influencerProfiles.isActive, true),
    with: {
      user: true,
    },
  })

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Influencers</h1>
        <Link href={userId ? "/dashboard" : "/sign-up"}>
          <Button>{userId ? "Dashboard" : "Sign Up"}</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {influencers.map((influencer) => (
          <div key={influencer.id} className="border rounded-lg overflow-hidden">
            <div className="aspect-video bg-muted">
              <img
                src={influencer.user.imageUrl || "/placeholder.svg?height=200&width=400"}
                alt={`${influencer.user.firstName} ${influencer.user.lastName}`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <h2 className="text-xl font-bold mb-2">
                {influencer.user.firstName} {influencer.user.lastName}
              </h2>
              <p className="text-muted-foreground mb-4 line-clamp-3">{influencer.bio || "No bio available"}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{formatPrice(influencer.messagePrice)} per message</span>
                <Link href={userId ? `/influencers/${influencer.userId}/message` : "/sign-in"}>
                  <Button size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}

        {influencers.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No influencers available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
