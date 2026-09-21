"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Video,
  BookOpen,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  ShieldCheck,
  FileCheck,
  UserCheck,
  GraduationCap as TeacherIcon,
  IndianRupee,
  AlertOctagon,
  BarChart2,
  Activity,
  Server,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronRight,
  Tag,
  Sparkles,
  Award,
  MessageSquare,
  CalendarCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/types/auth";
import { isEducatorRole, isLearnerRole, isAdminRole, getDashboardPathForRole } from "@/lib/auth/roles";
import { useToast } from "@/components/ui/toast";
import { NotificationPopover } from "@/components/layout/notification-popover";
import { PermissionProvider } from "@/components/shared/permission-guard";
import { DashboardFooter } from "@/components/layout/dashboard-footer";
import { BackToHomeButton } from "@/components/ui/back-to-home-button";
import { AdminSearchDialog } from "@/components/layout/admin-search-dialog";
import { Logo } from "@/components/brand/logo";

export interface DashboardLayoutProps {
  role: UserRole;
  userName?: string;
  userEmail?: string;
  children: React.ReactNode;
}

export interface AdminNavSection {
  id: string;
  title: string;
  items: {
    label: string;
    icon: any;
    href: string;
    badgeKey?: "pendingVerifications" | "draftCourses" | "openReports" | "pendingRefunds";
  }[];
}

export function DashboardLayout({ role, userName, userEmail, children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  const getDisplayRole = (r: string) => {
    if (r === "ADMIN") return "SUPER ADMIN";
    if (r === "STAFF") return "STAFF";
    if (r === "TEACHER" || r === "EDUCATOR") return "EDUCATOR";
    if (r === "STUDENT" || r === "LEARNER") return "LEARNER";
    return r;
  };

  const [currentUserName, setCurrentUserName] = useState<string>(userName || "");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(userEmail || "");
  const [currentRoleTitle, setCurrentRoleTitle] = useState<string>(getDisplayRole(role));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dynamicNav, setDynamicNav] = useState<any[] | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Real badge counts fetched from dashboard metrics API
  const [badgeCounts, setBadgeCounts] = useState<{
    pendingVerifications?: number;
    draftCourses?: number;
    openReports?: number;
    pendingRefunds?: number;
  }>({});

  useEffect(() => {
    if (userName && userName !== "User" && userName !== "Loading...") {
      setCurrentUserName(userName);
    }
    if (userEmail && userEmail !== "..." && userEmail !== "loading...") {
      setCurrentUserEmail(userEmail);
    }

    const verifyAndLoadAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });

        if (!res.ok) {
          if (res.status === 401) {
            const loginTarget =
              isEducatorRole(role)
                ? "/teacher/login"
                : isAdminRole(role)
                ? "/admin/login"
                : "/student/login";
            window.location.replace(loginTarget);
          }
          return;
        }

        const json = await res.json();
        if (json?.data?.user) {
          const u = json.data.user;
          if (isEducatorRole(role) && !isEducatorRole(u.role)) {
            window.location.replace(getDashboardPathForRole(u.role));
            return;
          }
          if (isLearnerRole(role) && !isLearnerRole(u.role)) {
            window.location.replace(getDashboardPathForRole(u.role));
            return;
          }
          if (isAdminRole(role) && !isAdminRole(u.role)) {
            window.location.replace(getDashboardPathForRole(u.role));
            return;
          }

          const resolvedName =
            u.name ||
            [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
            (u.email ? u.email.split("@")[0] : "");

          if (resolvedName) {
            setCurrentUserName(resolvedName);
          }
          if (u.email) {
            setCurrentUserEmail(u.email);
          }
          if (u.avatarUrl) {
            setAvatarUrl(u.avatarUrl);
          }
          if (u.roleName || u.role) {
            setCurrentRoleTitle(getDisplayRole((u.roleName || u.role).toUpperCase()));
          }
          if (Array.isArray(u.navigation) && u.navigation.length > 0) {
            setDynamicNav(u.navigation);
          }
        }
      } catch (err) {
        console.warn("Session verification warning:", err);
      }
    };

    verifyAndLoadAuth();

    // Fetch live badge counts for admin navigation
    if (isAdminRole(role) || role === "STAFF") {
      fetch("/api/admin/dashboard")
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.data?.metrics) {
            const m = json.data.metrics;
            setBadgeCounts({
              pendingVerifications: m.pendingVerifications || 0,
              draftCourses: Math.max(0, (m.totalCourses || 0) - (m.publishedCourses || 0)),
              openReports: m.openReports || 0,
              pendingRefunds: m.pendingRefunds || 0,
            });
          }
        })
        .catch(() => {});
    }

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        verifyAndLoadAuth();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [userName, userEmail, role]);

  // Keyboard shortcut for search palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const roleColors: Record<string, "admin" | "teacher" | "student"> = {
    ADMIN: "admin",
    STAFF: "admin",
    TEACHER: "teacher",
    EDUCATOR: "teacher",
    STUDENT: "student",
    LEARNER: "student",
  };

  const iconMap: Record<string, any> = {
    LayoutDashboard,
    Users,
    GraduationCap,
    TeacherIcon,
    ShieldCheck,
    BookOpen,
    Video,
    FileCheck,
    IndianRupee,
    AlertOctagon,
    BarChart2,
    Activity,
    Server,
    ShieldAlert,
    UserCheck,
    Settings,
    Tag,
    Sparkles,
    MessageSquare,
    CalendarCheck,
  };

  // Structured grouped admin navigation sections
  const adminNavSections: AdminNavSection[] = [
    {
      id: "overview",
      title: "OVERVIEW",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
      ],
    },
    {
      id: "promotions",
      title: "MARKETING & OFFERS",
      items: [
        { label: "Promotional Banners", icon: Sparkles, href: "/admin/banners" },
        { label: "Global Offers", icon: Tag, href: "/admin/offers" },
      ],
    },
    {
      id: "people",
      title: "PEOPLE",
      items: [
        { label: "User Governance", icon: Users, href: "/admin/users" },
        { label: "Educator Roster", icon: TeacherIcon, href: "/admin/teachers" },
        {
          label: "Educator Verifications",
          icon: ShieldCheck,
          href: "/admin/verification",
          badgeKey: "pendingVerifications",
        },
        { label: "Staff Management", icon: UserCheck, href: "/admin/staff" },
        { label: "Role Management", icon: ShieldAlert, href: "/admin/roles" },
      ],
    },
    {
      id: "content",
      title: "CONTENT",
      items: [
        {
          label: "Course Moderation",
          icon: BookOpen,
          href: "/admin/courses",
          badgeKey: "draftCourses",
        },
        {
          label: "Subject Management",
          icon: BookOpen,
          href: "/admin/subjects",
        },
        {
          label: "Content & User Reports",
          icon: AlertOctagon,
          href: "/admin/reports",
          badgeKey: "openReports",
        },
      ],
    },
    {
      id: "training_cert",
      title: "TRAINING & CERTIFICATION",
      items: [
        { label: "Educator Training Program", icon: GraduationCap, href: "/admin/training" },
        { label: "Certificate Management", icon: Award, href: "/admin/certificates" },
      ],
    },
    {
      id: "live",
      title: "LIVE",
      items: [
        { label: "Live Classes", icon: Video, href: "/admin/live-classes" },
      ],
    },
    {
      id: "finance",
      title: "FINANCE",
      items: [
        { label: "Financial Ledger & Payouts", icon: IndianRupee, href: "/admin/payments" },
        {
          label: "Refund Management",
          icon: FileCheck,
          href: "/admin/refunds",
          badgeKey: "pendingRefunds",
        },
      ],
    },
    {
      id: "insights",
      title: "INSIGHTS",
      items: [
        { label: "Platform Analytics", icon: BarChart2, href: "/admin/analytics" },
      ],
    },
    {
      id: "security_ops",
      title: "SECURITY & OPERATIONS",
      items: [
        { label: "WhatsApp Notifications", icon: MessageSquare, href: "/admin/whatsapp" },
        { label: "Audit & Security Logs", icon: Activity, href: "/admin/activity" },
        { label: "System Health", icon: Server, href: "/admin/system-health" },
      ],
    },
    {
      id: "settings",
      title: "SETTINGS",
      items: [
        { label: "Platform Settings", icon: Settings, href: "/admin/settings" },
      ],
    },
  ];

  const staticNavItems = {
    TEACHER: [
      { label: "Educator Dashboard", icon: LayoutDashboard, href: "/teacher/dashboard" },
      { label: "15-Day Training", icon: Award, href: "/teacher/training/learn" },
      { label: "Profile Onboarding", icon: FileCheck, href: "/teacher/onboarding" },
      { label: "Verification Status", icon: ShieldCheck, href: "/teacher/verification" },
      { label: "Live Class Slots", icon: Video, href: "/teacher/live-classes" },
      { label: "Courses & Content", icon: BookOpen, href: "/teacher/courses" },
    ],
    STUDENT: [
      { label: "Learner Hub", icon: LayoutDashboard, href: "/student/dashboard" },
      { label: "Find Educators", icon: TeacherIcon, href: "/student/teachers" },
      { label: "My Live Classes", icon: Video, href: "/student/live-classes" },
      { label: "Enrolled Courses", icon: BookOpen, href: "/student/courses" },
      { label: "Payment Log", icon: IndianRupee, href: "/student/payments" },
      { label: "Activity Log", icon: Activity, href: "/student/activity" },
      { label: "Attendance", icon: CalendarCheck, href: "/student/attendance" },
    ],
  };

  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Pragma: "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error("Unable to sign out. Please try again.");
      }

      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("educonnect_auth");
          localStorage.removeItem("educonnect_auth");
        } catch {}
        window.dispatchEvent(new Event("educonnect_auth_changed"));
      }

      showToast("Logged out", "You have been signed out.", "info");

      if (isEducatorRole(role)) {
        window.location.replace("/teacher/logout");
      } else if (isAdminRole(role)) {
        window.location.replace("/login");
      } else {
        window.location.replace("/student/login");
      }
    } catch (err: any) {
      setIsLoggingOut(false);
      showToast(
        "Sign Out Failed",
        err?.message || "Unable to sign out. Please try again.",
        "error"
      );
    }
  };

  const isAdminOrStaff = isAdminRole(role) || role === "STAFF";

  // Filter admin sections if dynamicNav is defined for staff
  const allowedHrefs = dynamicNav ? new Set(dynamicNav.map((i) => i.href)) : null;
  const filteredAdminSections = adminNavSections
    .map((sec) => {
      if (!allowedHrefs || role === "ADMIN") return sec;
      const items = sec.items.filter((item) => {
        if (item.href === "/admin") return allowedHrefs.has("/admin") || allowedHrefs.has("/staff/dashboard");
        return allowedHrefs.has(item.href);
      });
      return { ...sec, items };
    })
    .filter((sec) => sec.items.length > 0);

  return (
    <PermissionProvider>
      <div className="min-h-screen flex bg-[#F5F7F8]">
        {/* Mobile Backdrop & Sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-[#102A2A]/80 z-40 lg:hidden backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Desktop & Mobile Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-64 bg-[#073F3C] text-teal-100 border-r border-[#1B6863]/30 shrink-0 transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
          aria-label="Main Navigation"
        >
          {/* Logo Header */}
          <div className="p-5 border-b border-[#1B6863]/30 flex items-center justify-between">
            <Link
              href={isAdminOrStaff ? "/admin" : isEducatorRole(role) ? "/teacher/dashboard" : "/student/dashboard"}
              className="flex items-center gap-3 group min-w-0"
            >
              <Logo
                variant="mark"
                size="md"
                roleContext={isEducatorRole(role) ? "teacher" : isAdminOrStaff ? "admin" : "student"}
                href={false}
                priority
              />
              <div className="min-w-0">
                <h1 className="text-sm font-black text-white tracking-tight">
                  EDU<span className={isAdminOrStaff ? "text-[#F2C14E]" : isEducatorRole(role) ? "text-[#35A979]" : "text-[#667EEA]"}>CONNECTS</span>
                </h1>
                <Badge variant={roleColors[role] || "student"} size="sm">
                  {currentRoleTitle}
                </Badge>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-teal-200 hover:text-white p-1 rounded-lg"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Grouped Navigation Links */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto scrollbar-thin">
            {isAdminOrStaff ? (
              // Grouped Admin / Staff Navigation
              filteredAdminSections.map((section) => {
                const isOverview = section.id === "overview";
                const isCollapsed = Boolean(collapsedSections[section.id]);
                const containsActiveChild = section.items.some(
                  (item) =>
                    pathname === item.href ||
                    (item.href !== "/admin" && pathname.startsWith(item.href))
                );

                return (
                  <div key={section.id} className="space-y-1">
                    {/* Section Header (Except OVERVIEW which is always visible) */}
                    {!isOverview && (
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-extrabold text-teal-200/70 hover:text-white tracking-wider uppercase transition-colors"
                      >
                        <span>{section.title}</span>
                        {isCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 text-teal-300/60" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-teal-300/60" />
                        )}
                      </button>
                    )}

                    {/* Section Items */}
                    {(!isCollapsed || containsActiveChild) && (
                      <div className="space-y-1">
                        {section.items.map((item, idx) => {
                          const isActive =
                            pathname === item.href ||
                            (item.href !== "/admin" && pathname.startsWith(item.href));
                          const IconComponent = item.icon || LayoutDashboard;
                          const count = item.badgeKey ? badgeCounts[item.badgeKey] : undefined;

                          return (
                            <Link
                              key={idx}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                isActive
                                  ? "bg-[#0B4F4B] text-white shadow-md border border-[#F2C14E]/30 font-bold"
                                  : "text-teal-100/80 hover:bg-[#1B6863]/40 hover:text-white"
                              }`}
                            >
                              <IconComponent
                                className={`h-4 w-4 shrink-0 ${
                                  isActive ? "text-[#F2C14E]" : "text-teal-200/70"
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                              {count !== undefined && count > 0 && (
                                <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#F2C14E] text-[#073F3C] shadow-2xs shrink-0">
                                  {count}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // Teacher / Student Navigation
              <div className="space-y-1">
                {(isEducatorRole(role)
                  ? staticNavItems.TEACHER
                  : staticNavItems.STUDENT
                ).map((item, idx) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/teacher/dashboard" &&
                      item.href !== "/student/dashboard" &&
                      pathname.startsWith(item.href));
                  const IconComponent = item.icon || LayoutDashboard;
                  const isEducator = isEducatorRole(role);
                  return (
                    <Link
                      key={idx}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? isEducator
                            ? "bg-[#16805B] text-white shadow-md border border-[#35A979]/40"
                            : "bg-[#3157D5] text-white shadow-md border border-[#667EEA]/40"
                          : "text-teal-100/80 hover:bg-[#1B6863]/40 hover:text-white"
                      }`}
                    >
                      <IconComponent
                        className={`h-4 w-4 ${
                          isActive
                            ? isEducator
                              ? "text-[#35A979]"
                              : "text-[#667EEA]"
                            : "text-teal-200/70"
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-[#1B6863]/30 space-y-1.5">
            <BackToHomeButton variant="sidebar" />
            <button
              type="button"
              onClick={(e) => handleLogout(e)}
              disabled={isLoggingOut}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin text-rose-300" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace Container */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar Header */}
          <header className="h-16 bg-white border-b border-[#DCE5E4] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl text-[#102A2A] hover:bg-[#F5F7F8]"
                aria-label="Toggle navigation menu"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Quick Admin Action Search Trigger */}
              {isAdminOrStaff ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="relative hidden sm:flex items-center w-56 md:w-72 h-9 pl-9 pr-3 bg-[#F5F7F8] hover:bg-[#EDF2F2] border border-[#DCE5E4] rounded-xl text-xs text-[#5D7373] text-left transition-colors cursor-pointer"
                    title="Search portal (Ctrl+K)"
                  >
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5D7373]" />
                    <span className="truncate">Search admin portal...</span>
                    <kbd className="ml-auto text-[10px] font-mono bg-white border border-[#DCE5E4] px-1.5 py-0.5 rounded text-[#5D7373] shrink-0">
                      Ctrl+K
                    </kbd>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="sm:hidden p-2 rounded-xl text-[#102A2A] hover:bg-[#F5F7F8]"
                    title="Search portal"
                    aria-label="Search portal"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <div className="relative hidden sm:block w-48 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5D7373]" />
                  <input
                    type="text"
                    placeholder="Search portal..."
                    className="w-full h-9 pl-9 pr-4 bg-[#F5F7F8] border border-[#DCE5E4] rounded-xl text-xs text-[#102A2A] focus:border-[#0B4F4B] outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Back to Home Button */}
              <BackToHomeButton variant="default" />

              <NotificationPopover />

              {/* Admin Profile Area */}
              <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-[#DCE5E4]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={currentUserName || "User"}
                    className="w-9 h-9 rounded-full object-cover shadow-xs ring-1 ring-[#DCE5E4]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#0B4F4B] text-[#F2C14E] font-extrabold flex items-center justify-center text-xs shadow-xs uppercase border border-[#F2C14E]/30">
                    {currentUserName ? currentUserName.trim().charAt(0) : "A"}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-[#102A2A]">
                    {currentUserName || "Administrator"}
                  </div>
                  {currentUserEmail && (
                    <div className="text-[10px] text-[#5D7373] truncate max-w-[160px]">
                      {currentUserEmail}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Workspace */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
          <DashboardFooter />
        </div>

        {/* Global Admin Search Palette */}
        {isAdminOrStaff && (
          <AdminSearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        )}
      </div>
    </PermissionProvider>
  );
}
