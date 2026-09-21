"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ConnectionQuality, SessionStatus } from "@/types/classroom";
import { Wifi, WifiOff, Clock, UserCheck, Shield } from "lucide-react";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";
import { Logo } from "@/components/brand/logo";

interface ClassroomHeaderProps {
  title: string;
  subject: string;
  teacherName: string;
  status: SessionStatus;
  scheduledStartAt: string;
  actualStartAt?: string | null;
  connectionQuality: ConnectionQuality;
  isTeacher: boolean;
}

export function ClassroomHeader({
  title,
  subject,
  teacherName,
  status,
  scheduledStartAt,
  actualStartAt,
  connectionQuality,
  isTeacher,
}: ClassroomHeaderProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startTimestamp = actualStartAt
      ? new Date(actualStartAt).getTime()
      : new Date(scheduledStartAt).getTime();

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [actualStartAt, scheduledStartAt]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      const remMins = mins % 60;
      return `${hours.toString().padStart(2, "0")}:${remMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const renderConnectionBadge = () => {
    switch (connectionQuality) {
      case "CONNECTED":
        return (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Wifi className="h-3.5 w-3.5" /> Excellent Connection
          </span>
        );
      case "POOR_CONNECTION":
        return (
          <span className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <Wifi className="h-3.5 w-3.5" /> Poor Connection
          </span>
        );
      case "RECONNECTING":
        return (
          <span className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30 animate-pulse">
            <WifiOff className="h-3.5 w-3.5" /> Reconnecting...
          </span>
        );
      case "CONNECTING":
        return (
          <span className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
            <Clock className="h-3.5 w-3.5" /> Connecting...
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            <WifiOff className="h-3.5 w-3.5" /> Offline
          </span>
        );
    }
  };

  return (
    <header className="h-16 bg-slate-950/90 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4 backdrop-blur-md sticky top-0 z-30">
      {/* Brand & Class Title */}
      <div className="flex items-center gap-4 min-w-0">
        <Logo
          variant="compact"
          size="sm"
          theme="dark"
          href="/"
          showTagline
          priority
        />

        <div className="h-6 w-px bg-slate-800 hidden sm:block shrink-0" />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white truncate">{title}</h2>
            <Badge variant="secondary" className="hidden md:inline-flex text-[10px] bg-slate-800 text-slate-300 border-slate-700">
              {subject}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 truncate flex items-center gap-1">
            <UserCheck className="h-3 w-3 text-blue-400" /> Educator: {teacherName}
          </p>
        </div>
      </div>

      {/* Status, Timer & Connection */}
      <div className="flex items-center gap-3 shrink-0">
        {status === "LIVE" ? (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-black text-red-400 tracking-wider">LIVE</span>
            <span className="text-xs font-mono font-bold text-slate-200 ml-1">
              {formatTimer(elapsedSeconds)}
            </span>
          </div>
        ) : (
          <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-300 bg-amber-500/10">
            {status}
          </Badge>
        )}

        <div className="hidden lg:block">{renderConnectionBadge()}</div>
        <BackToHomeButton variant="dark" />
      </div>
    </header>
  );
}
