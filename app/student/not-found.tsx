"use client";

import React from "react";
import { NotFoundView } from "@/components/ui/error/not-found-view";

export default function StudentNotFound() {
  return (
    <NotFoundView
      portalName="Learner Portal"
      homeUrl="/student"
      description="The course, live class, or learner resource you are looking for was not found."
    />
  );
}
