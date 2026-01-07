'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Menu, User, LogOut, Moon, Sun, Radio } from 'lucide-react'

interface HeaderProps {
  user?: {
    email?: string | null
    role?: string
  } | null
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [hasActiveSession, setHasActiveSession] = useState(false)

  // Check for live run list
  useEffect(() => {
    const checkLiveStatus = async () => {
      try {
        const res = await fetch('/api/run-lists/active')
        const data = await res.json()
        setHasActiveSession(!!data.runList && data.runList.isLive === true)
      } catch (error) {
        setHasActiveSession(false)
      }
    }

    checkLiveStatus()
    // Check every 30 seconds
    const interval = setInterval(checkLiveStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/tracks', label: 'Tracks' },
    { href: '/cars', label: 'Cars' },
    { href: '/builds', label: 'Builds' },
    { href: '/run-lists', label: 'Run Lists' },
    { href: '/tonight', label: 'Tonight' },
    { href: '/lap-times', label: 'Lap Times' },
  ]

  const adminItems = user?.role === 'ADMIN' ? [
    { href: '/admin/users', label: 'Manage Users' },
    { href: '/admin/settings', label: 'Settings' },
  ] : []

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-fgt.png"
              alt="FridayGT"
              width={600}
              height={196}
              className="h-10 w-auto"
              priority
              unoptimized
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${
                  pathname === item.href
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {item.label === 'Tonight' && hasActiveSession && (
                  <Radio className="h-3.5 w-3.5 text-secondary animate-pulse" />
                )}
                <span className={item.label === 'Tonight' && hasActiveSession ? 'text-secondary font-bold' : ''}>
                  {item.label}
                </span>
                {item.label === 'Tonight' && hasActiveSession && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-4">
                    LIVE
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9"
          >
            <Moon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Sun className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {user ? (
            <>
              {/* Mobile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {navItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="flex items-center gap-2">
                        {item.label === 'Tonight' && hasActiveSession && (
                          <Radio className="h-3.5 w-3.5 text-secondary animate-pulse" />
                        )}
                        <span className={item.label === 'Tonight' && hasActiveSession ? 'text-secondary font-bold' : ''}>
                          {item.label}
                        </span>
                        {item.label === 'Tonight' && hasActiveSession && (
                          <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0 h-4">
                            LIVE
                          </Badge>
                        )}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  {adminItems.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {adminItems.map((item) => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link href={item.href}>{item.label}</Link>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.role}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {adminItems.length > 0 && (
                    <>
                      {adminItems.map((item) => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link href={item.href}>{item.label}</Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <form action="/api/auth/signout" method="POST">
                      <button type="submit" className="flex w-full items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
