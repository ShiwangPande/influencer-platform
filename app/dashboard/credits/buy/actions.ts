"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function CreateCheckoutAction(packageId: string, credits: number, price: number) {
  const { userId } = auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    throw new Error("User not found")
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${credits} Credits`,
            description: `Credit package for VoiceConnect`,
          },
          unit_amount: Math.round(price * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits/buy?canceled=true`,
    metadata: {
      userId,
      credits,
      packageId,
    },
  })

  if (session.url) {
    redirect(session.url)
  }
}
