import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/db"
import { userCredits, creditTransactions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get("Stripe-Signature") as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    // Get metadata
    const userId = session.metadata?.userId
    const credits = Number(session.metadata?.credits || 0)

    if (!userId || !credits) {
      return new NextResponse("Missing metadata", { status: 400 })
    }

    // Get user credits
    const userCreditsData = await db.query.userCredits.findFirst({
      where: eq(userCredits.userId, userId),
    })

    // Update or create user credits
    if (userCreditsData) {
      await db
        .update(userCredits)
        .set({
          balance: userCreditsData.balance + credits,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId))
    } else {
      await db.insert(userCredits).values({
        userId,
        balance: credits,
      })
    }

    // Record transaction
    await db.insert(creditTransactions).values({
      userId,
      amount: credits,
      type: "purchase",
      stripePaymentId: session.payment_intent as string,
    })
  }

  return new NextResponse(null, { status: 200 })
}
