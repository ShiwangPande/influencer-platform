import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users, userCredits, creditTransactions } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Plus } from "lucide-react"

export default async function CreditsPage() {
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

  if (dbUser.role === "influencer") {
    redirect("/dashboard")
  }

  // Get user credits
  const userCreditsData = await db.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  })

  // Get credit transactions
  const transactions = await db.query.creditTransactions.findMany({
    where: eq(creditTransactions.userId, userId),
    orderBy: [desc(creditTransactions.createdAt)],
    limit: 10,
  })

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Credits</h1>
        <Link href="/dashboard/credits/buy">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Buy Credits
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
      </div>

      <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
      {transactions.length > 0 ? (
        <div className="rounded-md border">
          <div className="grid grid-cols-4 p-4 font-medium border-b">
            <div>Date</div>
            <div>Type</div>
            <div>Amount</div>
            <div>Reference</div>
          </div>
          {transactions.map((transaction) => (
            <div key={transaction.id} className="grid grid-cols-4 p-4 border-b last:border-0">
              <div>{formatDate(transaction.createdAt)}</div>
              <div className="capitalize">{transaction.type}</div>
              <div className={transaction.amount > 0 ? "text-green-600" : "text-red-600"}>
                {transaction.amount > 0 ? "+" : ""}
                {transaction.amount}
              </div>
              <div className="truncate">{transaction.stripePaymentId || "-"}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No transactions yet</p>
        </div>
      )}
    </div>
  )
}
