import type React from "react"
import { redirect } from "next/navigation"
import { auth, currentUser } from "@clerk/nextjs/server"
import { DashboardNav } from "@/components/dashboard-nav"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = auth()
  const user = await currentUser()

  if (!userId || !user) {
    redirect("/sign-in")
  }

  // Check if user exists in our database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  // If not, create the user
  if (!dbUser) {
    await db.insert(users).values({
      id: userId,
      email: user.emailAddresses[0].emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      role: "user", // Default role
    })
  }

  // Get user with role
  const userWithRole = dbUser || { role: "user" }
  const isInfluencer = userWithRole.role === "influencer"
  const isAdmin = userWithRole.role === "admin"

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container flex h-16 items-center">
          <DashboardNav isInfluencer={isInfluencer} isAdmin={isAdmin} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
