"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ConnectionQuality, SessionStatus } from "@/types/classroom";
import { Wifi, WifiOff, Clock, UserCheck } from "lucide-react";
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
  participantCount?: number;
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
  participantCount = 1,
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
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 sm:px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Wifi className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Connected</span>
          </span>
        );
      case "POOR_CONNECTION":
        return (
          <span className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 sm:px-2.5 py-1 rounded-full border border-amber-500/20">
            <Wifi className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Poor Signal</span>
          </span>
        );
      case "RECONNECTING":
        return (
          <span className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold bg-amber-500/20 px-2 sm:px-2.5 py-1 rounded-full border border-amber-500/30 animate-pulse">
            <WifiOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Reconnecting</span>
          </span>
        );
      case "CONNECTING":
        return (
          <span className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold bg-blue-500/10 px-2 sm:px-2.5 py-1 rounded-full border border-blue-500/20">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Joining</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-slate-800 px-2 sm:px-2.5 py-1 rounded-full border border-slate-700">
            <WifiOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Offline</span>
          </span>
        );
    }
  };

  return (
    <header className="h-14 sm:h-16 bg-slate-950/95 border-b border-slate-800/80 px-2.5 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4 backdrop-blur-xl sticky top-0 z-30 shrink-0 select-none">
      {/* Brand & Class Title */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <Logo
          variant="compact"
          size="sm"
          theme="dark"
          href="/"
          showTagline={false}
          priority
        />

        <div className="h-5 w-px bg-slate-800 hidden xs:block shrink-0" />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px] sm:max-w-[220px] md:max-w-none">
              {title}
            </h2>
            <Badge variant="secondary" className="hidden md:inline-flex text-[9px] sm:text-[10px] bg-slate-800 text-slate-300 border-slate-700 px-1.5 py-0">
              {subject}
            </Badge>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 truncate flex items-center gap-1">
            <UserCheck className="h-3 w-3 text-blue-400 shrink-0" />
            <span className="truncate">{teacherName}</span>
          </p>
        </div>
      </div>

      {/* Status, Timer & Connection */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {status === "LIVE" ? (
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] sm:text-xs font-black text-red-400 tracking-wider">LIVE</span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-200">
              {formatTimer(elapsedSeconds)}
            </span>
          </div>
        ) : (
          <Badge variant="outline" className="text-[10px] sm:text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 px-2 py-0.5">
            {status}
          </Badge>
        )}

        {/* Participant Count Pill */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 sm:px-2.5 py-1 rounded-full text-slate-300 text-[10px] sm:text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{participantCount}</span>
          <span className="hidden sm:inline text-slate-400">in meeting</span>
        </div>

        <div>{renderConnectionBadge()}</div>
        <div className="hidden sm:block">
          <BackToHomeButton variant="dark" />
        </div>
      </div>
    </header>
  );
}
