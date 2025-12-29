'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Une erreur s&apos;est produite</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <Button variant="primary" onClick={reset}>
        Réessayer
      </Button>
    </div>
  )
}

