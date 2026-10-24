'use client';

import { SegmentError } from '@/components/marketplace/SegmentError';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SegmentError error={error} reset={reset} />;
}
