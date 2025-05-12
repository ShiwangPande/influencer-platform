import { WebhookEvent, verifySignature } from "@clerk/nextjs/api"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, userCredits } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers()
  const svix_id = (await headerPayload).get("svix-id")
  const svix_timestamp = (await headerPayload).get("svix-timestamp")
  const svix_signature = (await headerPayload).get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Error: Missing svix headers", { status: 400 })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Clerk webhook instance
  // Verify the webhook
  let evt: WebhookEvent
  try {
    evt = verifySignature(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    })
  } catch (err) {
    console.error("Error verifying webhook:", err)
    return new NextResponse("Error verifying webhook", { status: 400 })
  }

  // Get the ID and type
  const { id } = evt.data
  const eventType = evt.type

  // Handle user creation
  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    await db.insert(users).values({
      id,
      email: email_addresses[0].email_address,
      firstName: first_name,
      lastName: last_name,
      imageUrl: image_url,
      role: "user", // Default role
    })

    // Create initial credits for new user
    await db.insert(userCredits).values({
      userId: id,
      balance: 5, // Give 5 free credits to new users
    })
  }

  // Handle user update
  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    await db
      .update(users)
      .set({
        email: email_addresses[0].email_address,
        firstName: first_name,
        lastName: last_name,
        imageUrl: image_url,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
  }

  // Handle user deletion
  if (eventType === "user.deleted") {
    if (id) {
      await db.delete(users).where(eq(users.id, id))
    } else {
      console.error("Error: User ID is undefined")
    }
  }

  return new NextResponse(null, { status: 200 })
}
