import React from 'react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

export function PrimaryAction({ className, children, ...props }) {
  return (
    <Button variant="primary" className={cn('font-semibold', className)} {...props}>
      {children}
    </Button>
  )
}

export function SecondaryAction({ className, children, ...props }) {
  return (
    <Button variant="secondary" className={cn('font-semibold', className)} {...props}>
      {children}
    </Button>
  )
}

export function DestructiveAction({ className, children, ...props }) {
  return (
    <Button variant="danger" className={cn('font-semibold', className)} {...props}>
      {children}
    </Button>
  )
}

export function GhostAction({ className, children, ...props }) {
  return (
    <Button variant="ghost" className={cn('font-semibold', className)} {...props}>
      {children}
    </Button>
  )
}

export const ActionButtons = {
  PrimaryAction,
  SecondaryAction,
  DestructiveAction,
  GhostAction
}
