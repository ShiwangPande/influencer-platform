import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UpdateUserRoleAction } from "./actions"

export default async function AdminUsersPage() {
  const allUsers = await db.query.users.findMany({
    orderBy: [users.createdAt],
  })

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Manage Users</h1>

      <div className="rounded-md border">
        <div className="grid grid-cols-6 p-4 font-medium border-b">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Created</div>
          <div>Updated</div>
          <div>Actions</div>
        </div>
        {allUsers.map((user) => (
          <div key={user.id} className="grid grid-cols-6 p-4 border-b last:border-0">
            <div>
              {user.firstName} {user.lastName}
            </div>
            <div className="truncate">{user.email}</div>
            <div className="capitalize">{user.role}</div>
            <div>{formatDate(user.createdAt)}</div>
            <div>{formatDate(user.updatedAt)}</div>
            <div className="flex gap-2">
              {user.role !== "admin" && (
                <form action={UpdateUserRoleAction.bind(null, user.id, "admin")}>
                  <Button size="sm" variant="outline">
                    Make Admin
                  </Button>
                </form>
              )}
              {user.role !== "influencer" && (
                <form action={UpdateUserRoleAction.bind(null, user.id, "influencer")}>
                  <Button size="sm" variant="outline">
                    Make Influencer
                  </Button>
                </form>
              )}
              {user.role !== "user" && (
                <form action={UpdateUserRoleAction.bind(null, user.id, "user")}>
                  <Button size="sm" variant="outline">
                    Make User
                  </Button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
