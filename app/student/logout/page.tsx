"use client";

import React from "react";
import { LogoutPage } from "@/components/auth/logout-page";

export default function StudentLogoutPage() {
  return <LogoutPage roleContext="student" />;
}
