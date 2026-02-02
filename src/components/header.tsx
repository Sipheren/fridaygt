'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Menu, User, LogOut, Moon, Sun, Radio, Settings, StickyNote } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface NavItem {
  href: string
  label: string
  icon?: LucideIcon
}

interface HeaderProps {
  user?: {
    email?: string | null
    role?: string
  } | null
  version?: string
}

export function Header({ user, version }: HeaderProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [isBradMode, setIsBradMode] = useState(false)
  const [previousTheme, setPreviousTheme] = useState<string | null>(null)

  useEffect(() => {
    // Read BRAD MODE state from localStorage on mount
    const storedBradMode = localStorage.getItem('bradMode') === 'true'
    const storedPreviousTheme = localStorage.getItem('previousTheme')
    setIsBradMode(storedBradMode)

    if (storedPreviousTheme) {
      setPreviousTheme(storedPreviousTheme)
    }

    if (storedBradMode) {
      // Apply accessible-racing class if stored
      document.documentElement.classList.add('accessible-racing')
    }
  }, [])

  const toggleBradMode = () => {
    const htmlElement = document.documentElement
    const newState = !isBradMode

    if (newState) {
      // Save current theme before entering BRAD MODE
      const currentTheme = theme || 'dark'
      setPreviousTheme(currentTheme)
      localStorage.setItem('previousTheme', currentTheme)
      // Store BRAD MODE state in localStorage
      localStorage.setItem('bradMode', 'true')
      // Add accessible-racing class
      htmlElement.classList.add('accessible-racing')
    } else {
      // Clear BRAD MODE state from localStorage
      localStorage.setItem('bradMode', 'false')
      localStorage.removeItem('previousTheme')
      // Remove accessible-racing class
      htmlElement.classList.remove('accessible-racing')
      // Restore previous theme if we saved it
      if (previousTheme) {
        setTheme(previousTheme)
      }
    }
    setIsBradMode(newState)
  }

  const navItems: NavItem[] = [
    { href: '/tonight', label: 'Tonight' },
    { href: '/builds', label: 'Builds' },
    { href: '/races', label: 'Races' },
    { href: '/lap-times', label: 'Lap Times' },
    { href: '/notes', label: 'Notes', icon: StickyNote },
  ]

  const adminItems = user?.role === 'ADMIN' ? [
    { href: '/admin/users', label: 'Manage Users' },
  ] : []

  const settingsItem = { href: '/settings', label: 'Settings' }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary"></div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/tonight" className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
            <Image
              src="/logo-fgt.png"
              alt="FridayGT"
              width={600}
              height={196}
              className="h-8 w-auto sm:h-10"
              priority
            />
            {/* Version - Mobile: under logo, Desktop: inline with separator */}
            {version && (
              <>
                <div className="flex md:hidden text-xs font-mono font-medium text-destructive">
                  v{version}
                </div>
                <div className="hidden md:flex text-xs font-mono font-medium text-destructive border-r border-border pr-4">
                  v{version}
                </div>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  item.label === 'Tonight'
                    ? 'text-destructive hover:text-destructive/80 font-bold'
                    : pathname === item.href
                    ? 'text-foreground'
                    : 'text-muted-foreground gt-hover-text-link'
                }`}
              >
                {item.label === 'Tonight' && (
                  <Radio className="h-3.5 w-3.5" />
                )}
                {item.label === 'Notes' && (
                  <StickyNote className="h-3.5 w-3.5" />
                )}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* BRAD MODE Button */}
          <Button
            variant={isBradMode ? "default" : "outline"}
            size="sm"
            onClick={toggleBradMode}
            className="h-8 px-3 text-xs font-bold"
          >
            BRAD MODE
          </Button>

          {/* Theme Toggle - Hidden when BRAD MODE is active */}
          {!isBradMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-11 w-11 sm:h-9 sm:w-9"
            >
              <Moon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Sun className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}

          {user ? (
            <>
              {/* Mobile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="h-11 w-11 md:hidden">
                    <Menu className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {navItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2 ${
                          item.label === 'Tonight' ? 'text-destructive font-bold' : ''
                        }`}
                      >
                        {item.label === 'Tonight' && <Radio className="h-3.5 w-3.5" />}
                        {item.label === 'Notes' && <StickyNote className="h-3.5 w-3.5" />}
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={settingsItem.href}>{settingsItem.label}</Link>
                  </DropdownMenuItem>
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
                  <Button variant="ghost" className="relative h-11 w-11 rounded-full sm:h-9 sm:w-9">
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
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
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
