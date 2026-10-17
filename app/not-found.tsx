"use client";

import React from "react";
import { NotFoundView } from "@/components/ui/error/not-found-view";

export default function NotFound() {
  return (
    <NotFoundView
      portalName="EduConnects"
      homeUrl="/"
      description="Oops! The EduConnects page or learning resource you are looking for does not exist or has been moved."
    />
  );
}
