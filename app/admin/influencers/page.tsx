import { db } from "@/lib/db"
import { influencerProfiles } from "@/lib/db/schema"
import { formatDate, formatPrice } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ToggleInfluencerStatusAction, ToggleInfluencerVerificationAction } from "./actions"
import { CheckCircle, XCircle } from "lucide-react"

export default async function AdminInfluencersPage() {
  const allInfluencers = await db.query.influencerProfiles.findMany({
    with: {
      user: true,
    },
    orderBy: [influencerProfiles.createdAt],
  })

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Manage Influencers</h1>

      <div className="rounded-md border">
        <div className="grid grid-cols-7 p-4 font-medium border-b">
          <div>Name</div>
          <div>Email</div>
          <div>Price</div>
          <div>Verified</div>
          <div>Active</div>
          <div>Created</div>
          <div>Actions</div>
        </div>
        {allInfluencers.map((influencer) => (
          <div key={influencer.id} className="grid grid-cols-7 p-4 border-b last:border-0">
            <div>
              {influencer.user.firstName} {influencer.user.lastName}
            </div>
            <div className="truncate">{influencer.user.email}</div>
            <div>{formatPrice(influencer.messagePrice)}</div>
            <div>
              {influencer.isVerified ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div>
              {influencer.isActive ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div>{formatDate(influencer.createdAt)}</div>
            <div className="flex gap-2">
              <form action={ToggleInfluencerVerificationAction.bind(null, influencer.id, !influencer.isVerified)}>
                <Button size="sm" variant="outline">
                  {influencer.isVerified ? "Unverify" : "Verify"}
                </Button>
              </form>
              <form action={ToggleInfluencerStatusAction.bind(null, influencer.id, !influencer.isActive)}>
                <Button size="sm" variant="outline">
                  {influencer.isActive ? "Deactivate" : "Activate"}
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
