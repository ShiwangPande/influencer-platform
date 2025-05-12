import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import { CreateCheckoutAction } from "./actions"

const creditPackages = [
  {
    id: "basic",
    name: "Basic",
    credits: 10,
    price: 9.99,
    popular: false,
  },
  {
    id: "standard",
    name: "Standard",
    credits: 25,
    price: 19.99,
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    credits: 50,
    price: 34.99,
    popular: false,
  },
]

export default async function BuyCreditsPage() {
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

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Buy Credits</h1>

        <div className="grid gap-6 md:grid-cols-3">
          {creditPackages.map((pkg) => (
            <Card key={pkg.id} className={pkg.popular ? "border-primary" : ""}>
              {pkg.popular && (
                <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>{pkg.credits} Credits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-4">${pkg.price}</div>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm">Message any influencer</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm">Receive voice memos</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm">Email notifications</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <form action={CreateCheckoutAction.bind(null, pkg.id, pkg.credits, pkg.price)}>
                  <Button className="w-full">Buy Now</Button>
                </form>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
