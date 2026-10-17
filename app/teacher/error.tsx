"use client";

import React from "react";
import { PortalErrorBoundary } from "@/components/ui/error/portal-error-boundary";

export default function TeacherErrorBoundary({
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
      portalName="Educator Portal"
      homeUrl="/teacher/dashboard"
    />
  );
}
