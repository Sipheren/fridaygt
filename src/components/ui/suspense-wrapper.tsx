'use client'

import { Suspense, lazy, ComponentType } from 'react'
import { LoadingSection } from './loading'
import { RaceListSkeleton, BuildListSkeleton, LeaderboardSkeleton, LapTimeListSkeleton, StatsSkeleton, ProfileSkeleton } from './loading-skeletons'

type SuspenseWrapperProps = {
  children: React.ReactNode
  fallback?: React.ReactNode
}

// Generic Suspense wrapper with default loading state
export function SuspenseWrapper({ children, fallback }: SuspenseWrapperProps) {
  return (
    <Suspense fallback={fallback || <LoadingSection text="Loading..." />}>
      {children}
    </Suspense>
  )
}

// Specific Suspense wrappers for different content types
export function RaceListSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<RaceListSkeleton />}>
      {children}
    </Suspense>
  )
}

export function BuildListSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<BuildListSkeleton />}>
      {children}
    </Suspense>
  )
}

export function LeaderboardSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      {children}
    </Suspense>
  )
}

export function LapTimeListSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LapTimeListSkeleton />}>
      {children}
    </Suspense>
  )
}

export function StatsSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<StatsSkeleton />}>
      {children}
    </Suspense>
  )
}

export function ProfileSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      {children}
    </Suspense>
  )
}

// HOC for lazy loading components with suspense
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function SuspensedComponent(props: P) {
    return (
      <Suspense fallback={fallback || <LoadingSection text="Loading..." />}>
        <Component {...props} />
      </Suspense>
    )
  }
}

// HOC for lazy loading with custom skeleton
export function lazyWithSuspense<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc)
  return function SuspensedComponent(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback || <LoadingSection text="Loading..." />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}
