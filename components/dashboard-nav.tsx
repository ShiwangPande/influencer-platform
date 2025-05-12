"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { LayoutDashboard, MessageSquare, CreditCard, Settings, Users, BarChart } from "lucide-react"

import { cn } from "@/lib/utils"

interface NavProps {
  isInfluencer?: boolean
  isAdmin?: boolean
}

export function DashboardNav({ isInfluencer = false, isAdmin = false }: NavProps) {
  const pathname = usePathname()

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/messages",
      label: "Messages",
      icon: MessageSquare,
      active: pathname === "/dashboard/messages",
    },
    {
      href: "/dashboard/credits",
      label: "Credits",
      icon: CreditCard,
      active: pathname === "/dashboard/credits",
      hideFor: ["influencer", "admin"],
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
      active: pathname === "/dashboard/settings",
    },
  ]

  // Add influencer-specific routes
  if (isInfluencer) {
    routes.push({
      href: "/dashboard/earnings",
      label: "Earnings",
      icon: CreditCard,
      active: pathname === "/dashboard/earnings",
    })
  }

  // Add admin-specific routes
  if (isAdmin) {
    routes.push(
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        active: pathname.startsWith("/admin/users"),
      },
      {
        href: "/admin/influencers",
        label: "Influencers",
        icon: Users,
        active: pathname.startsWith("/admin/influencers"),
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: BarChart,
        active: pathname.startsWith("/admin/analytics"),
      },
    )
  }

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {routes.map((route) => {
        // Skip routes that should be hidden for the current user role
        if ((route.hideFor?.includes("influencer") && isInfluencer) || (route.hideFor?.includes("admin") && isAdmin)) {
          return null
        }

        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center text-sm font-medium transition-colors hover:text-primary",
              route.active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <route.icon className="mr-2 h-4 w-4" />
            {route.label}
          </Link>
        )
      })}
      <div className="ml-auto flex items-center space-x-4">
        <UserButton afterSignOutUrl="/" />
      </div>
    </nav>
  )
}
