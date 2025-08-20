
"use client";

import { Suspense } from 'react';
import { UpdateDataForm } from '@/components/update-data-form';
import { Loader2 } from 'lucide-react';

function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-muted">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
}

export default function UpdateDataPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <UpdateDataForm />
    </Suspense>
  );
}
