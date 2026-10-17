"use client";

import React from "react";
import { PortalErrorBoundary } from "@/components/ui/error/portal-error-boundary";

export default function StudentErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string; errorId?: string };
  reset: () => void;
}) {
  return (
    <PortalErrorBoundary
      error={error}
      reset={reset}
      portalName="Learner Portal"
      homeUrl="/student"
    />
  );
}
