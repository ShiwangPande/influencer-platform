import { redirect } from "next/navigation"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users, influencerProfiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UpdateProfileAction, BecomeInfluencerAction } from "./actions"

export default async function SettingsPage() {
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

  // Get influencer profile if exists
  const influencerProfile = isInfluencer
    ? await db.query.influencerProfiles.findFirst({
        where: eq(influencerProfiles.userId, userId),
      })
    : null

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your account profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={UpdateProfileAction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" defaultValue={user.firstName || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" defaultValue={user.lastName || ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user.emailAddresses[0].emailAddress}
                  disabled
                />
              </div>
              <Button type="submit">Save Changes</Button>
            </form>
          </CardContent>
        </Card>

        {isInfluencer ? (
          <Card>
            <CardHeader>
              <CardTitle>Influencer Settings</CardTitle>
              <CardDescription>Update your influencer profile</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={UpdateProfileAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    defaultValue={influencerProfile?.bio || ""}
                    placeholder="Tell your fans about yourself"
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="messagePrice">Message Price (Credits)</Label>
                  <Input
                    id="messagePrice"
                    name="messagePrice"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={influencerProfile?.messagePrice || 5}
                  />
                </div>
                <Button type="submit">Save Changes</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Become an Influencer</CardTitle>
              <CardDescription>Apply to become an influencer and receive messages from fans</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={BecomeInfluencerAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    placeholder="Tell your fans about yourself"
                    className="min-h-[120px]"
                    required
                  />
                </div>
                <Button type="submit">Apply Now</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
