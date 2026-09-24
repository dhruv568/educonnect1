"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export interface PromotionalBannerItem {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  bannerType: "OFFER" | "PROMOTION" | "ANNOUNCEMENT" | "COURSE_PROMOTION" | "EVENT" | "GENERAL" | string;
  imageUrl: string;
  imageClickUrl?: string | null;
  imageClickTarget?: "_self" | "_blank" | string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  placement: "ALL" | "MAIN" | "LEARNERS" | "EDUCATORS" | string;
  displayOrder: number;
}

export interface PromotionalBannerCarouselProps {
  placement?: "MAIN" | "LEARNERS" | "EDUCATORS";
  initialBanners?: PromotionalBannerItem[];
  previewMode?: boolean;
}

// Global in-memory cache to prevent blank loading spaces and repeat network waits
const activeBannersCache: Record<string, PromotionalBannerItem[]> = {};

export function PromotionalBannerCarousel({
  placement: explicitPlacement,
  initialBanners,
  previewMode = false,
}: PromotionalBannerCarouselProps) {
  const pathname = usePathname() || "/";

  // Exclude non-public pages (admin, classroom, auth, live sessions)
  const isExcluded = useMemo(() => {
    if (previewMode) return false;
    const clean = pathname.toLowerCase();
    return (
      clean.startsWith("/admin") ||
      clean.startsWith("/staff") ||
      clean.startsWith("/classroom") ||
      clean.startsWith("/live/session") ||
      clean.startsWith("/payment/checkout") ||
      clean.startsWith("/checkout") ||
      clean.startsWith("/login") ||
      clean.startsWith("/register") ||
      clean.startsWith("/verify-") ||
      clean.startsWith("/reset-password") ||
      clean.startsWith("/forgot-password")
    );
  }, [pathname, previewMode]);

  // Determine current website context / theme
  const siteContext = useMemo((): "MAIN" | "LEARNERS" | "EDUCATORS" => {
    if (explicitPlacement) return explicitPlacement;
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      if (
        host.startsWith("educators.") ||
        host.startsWith("educator.") ||
        host.startsWith("teachers.") ||
        host.startsWith("teacher.")
      ) {
        return "EDUCATORS";
      }
      if (
        host.startsWith("learners.") ||
        host.startsWith("learner.") ||
        host.startsWith("students.") ||
        host.startsWith("student.")
      ) {
        return "LEARNERS";
      }
    }
    if (pathname.startsWith("/teacher")) return "EDUCATORS";
    if (pathname.startsWith("/student")) return "LEARNERS";
    return "MAIN";
  }, [explicitPlacement, pathname]);

  // Initialize banners from props or in-memory cache to eliminate loading flickers
  const [banners, setBanners] = useState<PromotionalBannerItem[]>(() => {
    if (initialBanners && initialBanners.length > 0) return initialBanners;
    if (activeBannersCache[siteContext]) return activeBannersCache[siteContext];
    return [];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  // Mouse & Touch Drag Navigation state
  const isDraggingRef = useRef(false);
  const startXRef = useRef<number | null>(null);
  const dragDistanceRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch active banners for this placement & keep memory cache updated
  useEffect(() => {
    if ((initialBanners && initialBanners.length > 0) || isExcluded) return;

    let isMounted = true;
    const fetchBanners = async () => {
      try {
        const queryParam = siteContext ? `?placement=${encodeURIComponent(siteContext)}` : "";
        let res = await fetch(`/api/banners/active${queryParam}`, {
          cache: "no-store",
        });

        if (!res.ok && typeof window !== "undefined") {
          try {
            res = await fetch(`${window.location.origin}/api/banners/active${queryParam}`, {
              cache: "no-store",
            });
          } catch {
            // Ignore secondary error
          }
        }

        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.data?.banners)) {
            const fetched: PromotionalBannerItem[] = json.data.banners;
            activeBannersCache[siteContext] = fetched;
            setBanners(fetched);
          }
        }
      } catch (err) {
        console.error("[PromotionalBannerCarousel] Active banners fetch error:", err);
      }
    };

    fetchBanners();

    return () => {
      isMounted = false;
    };
  }, [siteContext, isExcluded, initialBanners]);

  // Navigation handlers
  const total = banners.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Smooth automatic banner rotation with pause on center hover/hold
  useEffect(() => {
    if (total <= 1 || isHovered) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 3500); // 3.5s rotation

    return () => clearInterval(interval);
  }, [total, isHovered, nextSlide]);

  // Center Hover / Movement Detection to pause rotation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    // Center 70% region (0.15 to 0.85) pauses autoplay
    if (relativeX >= 0.15 && relativeX <= 0.85) {
      setIsHovered(true);
    } else if (!isDraggingRef.current) {
      setIsHovered(false);
    }
  };

  // Mouse Drag / Swipe Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    dragDistanceRef.current = 0;
    setIsHovered(true);
  };

  const handleMouseDragMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || startXRef.current === null) return;
    const diff = e.clientX - startXRef.current;
    dragDistanceRef.current = Math.abs(diff);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDraggingRef.current && startXRef.current !== null) {
      const diff = e.clientX - startXRef.current;
      const threshold = 35; // px threshold for drag navigation
      if (diff < -threshold) {
        nextSlide();
      } else if (diff > threshold) {
        prevSlide();
      }
    }
    isDraggingRef.current = false;
    startXRef.current = null;
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.touches[0].clientX;
    dragDistanceRef.current = 0;
    setIsHovered(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || startXRef.current === null) return;
    const diff = e.touches[0].clientX - startXRef.current;
    dragDistanceRef.current = Math.abs(diff);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDraggingRef.current && startXRef.current !== null && e.changedTouches[0]) {
      const diff = e.changedTouches[0].clientX - startXRef.current;
      const threshold = 35;
      if (diff < -threshold) {
        nextSlide();
      } else if (diff > threshold) {
        prevSlide();
      }
    }
    isDraggingRef.current = false;
    startXRef.current = null;
    setIsHovered(false);
  };

  // Prevent link click when dragging
  const handleLinkClick = (e: React.MouseEvent) => {
    if (dragDistanceRef.current > 8) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (total <= 1) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevSlide();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextSlide();
    }
  };

  if (isExcluded || (!previewMode && banners.length === 0)) {
    return null;
  }

  const currentBanner = banners[currentIndex] || banners[0];
  if (!currentBanner) return null;

  const hasImageClick = Boolean(currentBanner.imageClickUrl && currentBanner.imageClickUrl.trim());
  const clickTarget = currentBanner.imageClickTarget === "_blank" ? "_blank" : undefined;
  const clickRel = currentBanner.imageClickTarget === "_blank" ? "noopener noreferrer" : undefined;

  const bannerImageSrc =
    imageErrorMap[currentBanner.id || currentBanner.imageUrl]
      ? "/images/educonnects-owner-banner.jpeg"
      : currentBanner.imageUrl;

  return (
    <section
      aria-label="Promotional Banner Carousel"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`w-full relative z-20 focus:outline-none ${
        previewMode
          ? "pt-0 pb-0"
          : "pt-20 sm:pt-24 pb-2 sm:pb-3"
      }`}
    >
      <div className={previewMode ? "px-0" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            isDraggingRef.current = false;
          }}
          onMouseDown={handleMouseDown}
          onMouseMoveCapture={handleMouseDragMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`relative w-full overflow-hidden bg-slate-950 select-none ${
            previewMode
              ? "max-w-[800px] mx-auto rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg aspect-[3/1] sm:aspect-[4/1]"
              : "rounded-2xl sm:rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xl aspect-[16/7] sm:aspect-[2.5/1] md:aspect-[2.8/1] lg:aspect-[3.2/1]"
          }`}
        >
          {/* Ambient Blurred Backdrop matching Banner Image colors */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
            <Image
              src={bannerImageSrc}
              alt=""
              fill
              className="object-cover w-full h-full blur-2xl scale-110 opacity-30"
              unoptimized={true}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
          </div>

          {/* Smooth Fade-Scale Slide Transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner.id || currentIndex}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              className="relative w-full h-full z-10 flex items-center justify-center"
            >
              {hasImageClick ? (
                <Link
                  href={currentBanner.imageClickUrl!.trim()}
                  target={clickTarget}
                  rel={clickRel}
                  onClick={handleLinkClick}
                  aria-label={`Promotional banner: ${currentBanner.title || "EduConnects Banner"}`}
                  className="relative block w-full h-full cursor-pointer focus:outline-none select-none"
                >
                  <Image
                    src={bannerImageSrc}
                    alt={currentBanner.title || "Promotional Banner"}
                    fill
                    priority={currentIndex === 0}
                    loading="eager"
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    className="object-cover w-full h-full"
                    unoptimized={true}
                    onError={() => {
                      setImageErrorMap((prev) => ({
                        ...prev,
                        [currentBanner.id || currentBanner.imageUrl]: true,
                      }));
                    }}
                  />
                </Link>
              ) : (
                <div
                  aria-label={`Promotional banner: ${currentBanner.title || "EduConnects Banner"}`}
                  className="relative w-full h-full cursor-default select-none"
                >
                  <Image
                    src={bannerImageSrc}
                    alt={currentBanner.title || "Promotional Banner"}
                    fill
                    priority={currentIndex === 0}
                    loading="eager"
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    className="object-cover w-full h-full"
                    unoptimized={true}
                    onError={() => {
                      setImageErrorMap((prev) => ({
                        ...prev,
                        [currentBanner.id || currentBanner.imageUrl]: true,
                      }));
                    }}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default PromotionalBannerCarousel;
