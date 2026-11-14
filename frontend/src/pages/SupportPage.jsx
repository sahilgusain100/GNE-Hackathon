import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, LifeBuoy } from 'lucide-react'
import MarketplaceLayout from '../components/layout/MarketplaceLayout'
import SupportCentre from '../components/support/SupportCentre'

const SupportPage = () => {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId') || ''
  const orderNumber = searchParams.get('orderNumber') || ''

  return (
    <MarketplaceLayout>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition"
            to="/marketplace"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Marketplace</span>
          </Link>
        </div>

        <SupportCentre
          prefilledOrderId={orderId}
          prefilledOrderNumber={orderNumber}
        />
      </main>
    </MarketplaceLayout>
  )
}

export default SupportPage
