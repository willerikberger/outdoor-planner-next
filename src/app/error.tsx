'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex h-screen items-center justify-center bg-[#1a1a2e]">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[#e94560] mb-4">
          Something went wrong
        </h2>
        <p className="text-[#888] mb-6 max-w-md">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-[#e94560] text-white rounded-md hover:bg-[#ff6b6b] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
