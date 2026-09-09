'use client'
import { useTransition } from 'react'
import { signInWithGoogleAction } from '../actions/auth-actions'
export function useGoogleSignIn() {
  const [isPending, startTransition] = useTransition()
  return { isPending, handleSignIn: () => startTransition(() => signInWithGoogleAction()) }
}
