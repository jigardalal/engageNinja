import React from 'react'
import { cn } from '../../lib/utils'

/**
 * Container Component
 *
 * Purpose: Full-width container with responsive padding
 * Replaces max-w-7xl pattern with flexible full-width approach
 *
 * Usage:
 * <Container>
 *   <h1>Page Title</h1>
 *   <p>Content here</p>
 * </Container>
 *
 * Sizes:
 * - full: Full width with responsive padding (default)
 * - constrained: Max-width 6xl for reading-heavy content
 * - narrow: Max-width 4xl for very focused content
 */
export function Container({ children, className, size = 'full' }) {
  const sizeClasses = {
    full: 'w-full px-4 sm:px-6 lg:px-12 xl:px-16',
    constrained: 'max-w-6xl mx-auto px-4 sm:px-6',
    narrow: 'max-w-4xl mx-auto px-4 sm:px-6'
  }

  return (
    <div className={cn(sizeClasses[size], className)}>
      {children}
    </div>
  )
}

export default Container
