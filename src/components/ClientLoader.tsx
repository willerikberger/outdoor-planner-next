'use client'

import dynamic from 'next/dynamic'

const PlannerApp = dynamic(() => import('@/components/PlannerApp'), {
  ssr: false,
  loading: () => <LoadingSkeleton />,
})

function LoadingSkeleton() {
  return (
    <div className="flex h-screen">
      <div className="w-[340px] bg-[#16213e] p-5">
        <div className="h-8 w-48 animate-pulse rounded bg-[#0f3460] mb-3" />
        <div className="h-4 w-64 animate-pulse rounded bg-[#0f3460] mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-4">
            <div className="h-4 w-32 animate-pulse rounded bg-[#0f3460] mb-2" />
            <div className="h-10 w-full animate-pulse rounded bg-[#0f3460]" />
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col bg-[#0d1b2a]">
        <div className="h-12 bg-[#16213e] border-b border-[#0f3460]" />
        <div className="flex-1" />
        <div className="h-8 bg-[#16213e] border-t border-[#0f3460]" />
      </div>
    </div>
  )
}

export function ClientLoader() {
  return <PlannerApp />
}
