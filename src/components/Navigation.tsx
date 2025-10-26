"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Settings, Sliders, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg gradient-purple glow-purple-soft flex items-center justify-center">
              <span className="text-xl font-bold">K</span>
            </div>
            <span className="text-xl font-bold text-glow">KinSnake</span>
          </div>

          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300",
                    isActive
                      ? "gradient-purple glow-purple-soft text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary hover-glow"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}