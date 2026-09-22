"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuthPermissions } from "@/components/shared/permission-guard";
import { useToast } from "@/components/ui/toast";
import { PromotionalBannerCarousel } from "@/components/banners/promotional-banner-carousel";
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
  Power,
  Calendar,
  ExternalLink,
  Eye,
  Clock,
  AlertCircle,
  Globe,
  ArrowRight,
  Flame,
  Bell,
  BookOpen,
  Tag,
  Upload,
  Copy,
  ArrowUpDown,
  MousePointer,
  Link as LinkIcon,
  HelpCircle,
  Check,
  X,
  Smartphone,
  Monitor,
  Crop,
  Move,
  ZoomIn,
  Minus,
  RotateCcw,
} from "lucide-react";

export interface PromotionalBanner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  bannerType: "OFFER" | "PROMOTION" | "ANNOUNCEMENT" | "COURSE_PROMOTION" | "EVENT" | "GENERAL";
  imageUrl: string;
  imageClickUrl: string | null;
  imageClickTarget: "_self" | "_blank";
  ctaText: string | null;
  ctaUrl: string | null;
  placement: "ALL" | "MAIN" | "LEARNERS" | "EDUCATORS";
  displayOrder: number;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPromotionalBannersPage() {
  const { user } = useAuthPermissions();
  const { showToast } = useToast();

  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SCHEDULED" | "EXPIRED" | "INACTIVE">("ALL");
  const [placementFilter, setPlacementFilter] = useState<"ALL" | "MAIN" | "LEARNERS" | "EDUCATORS">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromotionalBanner | null>(null);
  const [previewBanner, setPreviewBanner] = useState<PromotionalBanner | null>(null);
  const [deleteConfirmBanner, setDeleteConfirmBanner] = useState<PromotionalBanner | null>(null);

  // Form inputs
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBannerType, setFormBannerType] = useState<PromotionalBanner["bannerType"]>("OFFER");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formImageClickUrl, setFormImageClickUrl] = useState("");
  const [formImageClickTarget, setFormImageClickTarget] = useState<"_self" | "_blank">("_self");
  const [formCtaText, setFormCtaText] = useState("Explore Courses");
  const [formCtaUrl, setFormCtaUrl] = useState("/courses");
  const [formPlacement, setFormPlacement] = useState<PromotionalBanner["placement"]>("ALL");
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(0);
  const [formStartAt, setFormStartAt] = useState("");
  const [formEndAt, setFormEndAt] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live preview settings inside modal
  const [previewTheme, setPreviewTheme] = useState<"MAIN" | "LEARNERS" | "EDUCATORS">("MAIN");

  // Image Cropper Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string>("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropImageNatDim, setCropImageNatDim] = useState({ width: 0, height: 0 });
  const [cropViewportDim, setCropViewportDim] = useState({ width: 800, height: 250 });

  const cropStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cropPanStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchDistStartRef = useRef<number>(0);
  const pinchZoomStartRef = useRef<number>(1);
  const cropViewportRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isCropModalOpen && cropViewportRef.current) {
      const vpW = cropViewportRef.current.offsetWidth;
      const vpH = cropViewportRef.current.offsetHeight;
      if (vpW > 0 && vpH > 0) {
        setCropViewportDim({ width: vpW, height: vpH });
      }
    }
  }, [isCropModalOpen]);

  const getClampedPan = (newZoom: number, newPan: { x: number; y: number }) => {
    const vpW = cropViewportDim.width || cropViewportRef.current?.offsetWidth || 800;
    const vpH = cropViewportDim.height || cropViewportRef.current?.offsetHeight || 250;
    const imgW = cropImageNatDim.width || cropImageRef.current?.naturalWidth || 800;
    const imgH = cropImageNatDim.height || cropImageRef.current?.naturalHeight || 800;

    const coverScale = Math.max(vpW / imgW, vpH / imgH);
    const dispW = imgW * coverScale * newZoom;
    const dispH = imgH * coverScale * newZoom;

    const maxPanX = Math.max(0, (dispW - vpW) / 2);
    const maxPanY = Math.max(0, (dispH - vpH) / 2);

    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, newPan.x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, newPan.y)),
    };
  };

  const cropGeometry = useMemo(() => {
    const vpW = cropViewportDim.width || 800;
    const vpH = cropViewportDim.height || 250;
    const imgW = cropImageNatDim.width || 800;
    const imgH = cropImageNatDim.height || 800;

    const coverScale = Math.max(vpW / imgW, vpH / imgH);
    const dispW = imgW * coverScale * cropZoom;
    const dispH = imgH * coverScale * cropZoom;

    const maxPanX = Math.max(0, (dispW - vpW) / 2);
    const maxPanY = Math.max(0, (dispH - vpH) / 2);

    const clampedX = Math.min(maxPanX, Math.max(-maxPanX, cropPan.x));
    const clampedY = Math.min(maxPanY, Math.max(-maxPanY, cropPan.y));

    return { coverScale, dispW, dispH, maxPanX, maxPanY, clampedX, clampedY, vpW, vpH, imgW, imgH };
  }, [cropViewportDim, cropImageNatDim, cropZoom, cropPan]);

  const handleCropImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const vpW = cropViewportRef.current?.offsetWidth || 800;
    const vpH = cropViewportRef.current?.offsetHeight || 250;
    const nw = img.naturalWidth || img.width || 800;
    const nh = img.naturalHeight || img.height || 250;
    setCropImageNatDim({ width: nw, height: nh });
    setCropViewportDim({ width: vpW, height: vpH });
  };

  const handleOpenCropModal = () => {
    if (!formImageUrl.trim()) {
      showToast("No Image Selected", "Upload or enter an image URL first before cropping.", "info");
      return;
    }
    setCropSrc(formImageUrl.trim());
    setCropZoom(1);
    setCropPan({ x: 0, y: 0 });
    setIsCropModalOpen(true);
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    setIsDraggingCrop(true);
    cropStartRef.current = { x: e.clientX, y: e.clientY };
    cropPanStartRef.current = { ...cropPan };
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCrop) return;
    const dx = e.clientX - cropStartRef.current.x;
    const dy = e.clientY - cropStartRef.current.y;
    const newPan = getClampedPan(cropZoom, {
      x: cropPanStartRef.current.x + dx,
      y: cropPanStartRef.current.y + dy,
    });
    setCropPan(newPan);
  };

  const handleCropMouseUp = () => {
    setIsDraggingCrop(false);
  };

  const handleCropTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDraggingCrop(true);
      cropStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      cropPanStartRef.current = { ...cropPan };
    } else if (e.touches.length === 2) {
      setIsDraggingCrop(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchDistStartRef.current = dist;
      pinchZoomStartRef.current = cropZoom;
    }
  };

  const handleCropTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingCrop) {
      const dx = e.touches[0].clientX - cropStartRef.current.x;
      const dy = e.touches[0].clientY - cropStartRef.current.y;
      const newPan = getClampedPan(cropZoom, {
        x: cropPanStartRef.current.x + dx,
        y: cropPanStartRef.current.y + dy,
      });
      setCropPan(newPan);
    } else if (e.touches.length === 2 && pinchDistStartRef.current > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / pinchDistStartRef.current;
      const newZoom = Math.min(4.0, Math.max(1.0, parseFloat((pinchZoomStartRef.current * scale).toFixed(2))));
      const newPan = getClampedPan(newZoom, cropPan);
      setCropZoom(newZoom);
      setCropPan(newPan);
    }
  };

  const handleCropTouchEnd = () => {
    setIsDraggingCrop(false);
    pinchDistStartRef.current = 0;
  };

  const handleCropWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const newZoom = Math.min(4.0, Math.max(1.0, parseFloat((cropZoom + delta).toFixed(2))));
    const newPan = getClampedPan(newZoom, cropPan);
    setCropZoom(newZoom);
    setCropPan(newPan);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(4.0, parseFloat((cropZoom + 0.1).toFixed(2)));
    const newPan = getClampedPan(newZoom, cropPan);
    setCropZoom(newZoom);
    setCropPan(newPan);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(1.0, parseFloat((cropZoom - 0.1).toFixed(2)));
    const newPan = getClampedPan(newZoom, cropPan);
    setCropZoom(newZoom);
    setCropPan(newPan);
  };

  const handleZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = Math.min(4.0, Math.max(1.0, parseFloat(e.target.value)));
    const newPan = getClampedPan(newZoom, cropPan);
    setCropZoom(newZoom);
    setCropPan(newPan);
  };

  const handleResetCropPosition = () => {
    setCropZoom(1);
    setCropPan({ x: 0, y: 0 });
  };

  const [isCropping, setIsCropping] = useState(false);

  const handleApplyCrop = () => {
    if (!cropSrc || isCropping) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = cropSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const vpW = cropViewportRef.current?.offsetWidth || 800;
      const vpH = cropViewportRef.current?.offsetHeight || 250;
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;

      const coverScale = Math.max(vpW / imgW, vpH / imgH);
      const dispW = imgW * coverScale * cropZoom;
      const dispH = imgH * coverScale * cropZoom;

      const scaleCanvas = 1280 / vpW;

      const drawWidth = dispW * scaleCanvas;
      const drawHeight = dispH * scaleCanvas;

      const drawX = (1280 - drawWidth) / 2 + cropGeometry.clampedX * scaleCanvas;
      const drawY = (400 - drawHeight) / 2 + cropGeometry.clampedY * scaleCanvas;

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      setIsCropping(true);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsCropping(false);
          showToast("Crop Error", "Unable to save the banner image. Please try again.", "error");
          return;
        }

        try {
          const formData = new FormData();
          formData.append("file", blob, "cropped_banner.jpg");

          const res = await fetch("/api/admin/banners/upload", {
            method: "POST",
            body: formData,
          });

          const json = await res.json();
          if (!res.ok || !json.success || !json.data?.url) {
            throw new Error(json.error || "Unable to save the banner image. Please try again.");
          }

          setFormImageUrl(json.data.url);
          setIsCropModalOpen(false);
          showToast("Image Cropped", "Banner image cropped to 3.2:1 aspect ratio and saved to storage.", "success");
        } catch (err: any) {
          showToast("Crop Upload Error", err.message || "Unable to save the banner image. Please try again.", "error");
        } finally {
          setIsCropping(false);
        }
      }, "image/jpeg", 0.90);
    };
    img.onerror = () => {
      showToast("Crop Error", "Failed to load image for cropping. Please check image URL.", "error");
    };
  };

  // Fetch banners from API
  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.banners)) {
        setBanners(json.data.banners);
      } else {
        showToast("Error", json.error || "Failed to load banners.", "error");
      }
    } catch (err: any) {
      showToast("Error", "Failed to communicate with banner server.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Determine banner status badge
  const getBannerStatus = (banner: PromotionalBanner): { label: string; color: string; bg: string; border: string } => {
    const now = new Date();
    if (!banner.isActive) {
      return {
        label: "Inactive",
        color: "text-slate-600",
        bg: "bg-slate-100",
        border: "border-slate-200",
      };
    }
    if (banner.startAt && new Date(banner.startAt) > now) {
      return {
        label: "Scheduled",
        color: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
      };
    }
    if (banner.endAt && new Date(banner.endAt) < now) {
      return {
        label: "Expired",
        color: "text-rose-700",
        bg: "bg-rose-50",
        border: "border-rose-200",
      };
    }
    return {
      label: "Active",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    };
  };

  // Reset form
  const resetForm = () => {
    setEditingBanner(null);
    setFormTitle("");
    setFormSubtitle("");
    setFormDescription("");
    setFormBannerType("OFFER");
    setFormImageUrl("");
    setFormImageClickUrl("");
    setFormImageClickTarget("_self");
    setFormCtaText("Explore Courses");
    setFormCtaUrl("/courses");
    setFormPlacement("ALL");
    setFormDisplayOrder(0);
    setFormStartAt("");
    setFormEndAt("");
    setFormIsActive(true);
    setPreviewTheme("MAIN");
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    resetForm();
    // Default display order to next sequence
    const maxOrder = banners.reduce((max, b) => Math.max(max, b.displayOrder), -1);
    setFormDisplayOrder(maxOrder + 1);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (banner: PromotionalBanner) => {
    setEditingBanner(banner);
    setFormTitle(banner.title);
    setFormSubtitle(banner.subtitle || "");
    setFormDescription(banner.description || "");
    setFormBannerType(banner.bannerType);
    setFormImageUrl(banner.imageUrl);
    setFormImageClickUrl(banner.imageClickUrl || "");
    setFormImageClickTarget(banner.imageClickTarget || "_self");
    setFormCtaText(banner.ctaText || "Explore Courses");
    setFormCtaUrl(banner.ctaUrl || "/courses");
    setFormPlacement(banner.placement);
    setFormDisplayOrder(banner.displayOrder);
    setFormStartAt(banner.startAt ? banner.startAt.slice(0, 16) : "");
    setFormEndAt(banner.endAt ? banner.endAt.slice(0, 16) : "");
    setFormIsActive(banner.isActive);
    setPreviewTheme(banner.placement === "ALL" ? "MAIN" : (banner.placement as any));
    setIsFormModalOpen(true);
  };

  // Duplicate Banner
  const handleDuplicate = (banner: PromotionalBanner) => {
    resetForm();
    setFormTitle(`${banner.title} (Copy)`);
    setFormSubtitle(banner.subtitle || "");
    setFormDescription(banner.description || "");
    setFormBannerType(banner.bannerType);
    setFormImageUrl(banner.imageUrl);
    setFormImageClickUrl(banner.imageClickUrl || "");
    setFormImageClickTarget(banner.imageClickTarget || "_self");
    setFormCtaText(banner.ctaText || "Explore Courses");
    setFormCtaUrl(banner.ctaUrl || "/courses");
    setFormPlacement(banner.placement);
    setFormDisplayOrder(banner.displayOrder + 1);
    setFormStartAt(banner.startAt ? banner.startAt.slice(0, 16) : "");
    setFormEndAt(banner.endAt ? banner.endAt.slice(0, 16) : "");
    setFormIsActive(false); // Duplicates start as inactive for review
    setPreviewTheme(banner.placement === "ALL" ? "MAIN" : (banner.placement as any));
    setIsFormModalOpen(true);
    showToast("Banner Duplicated", "Modify details and save to create the new banner.", "info");
  };

  // Handle Image Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("File Too Large", "Banner images must be smaller than 10MB.", "error");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/banners/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to upload image.");
      }

      setFormImageUrl(json.data.url);
      showToast("Image Uploaded", "Banner image uploaded successfully.", "success");
    } catch (err: any) {
      showToast("Upload Failed", err.message || "Could not upload image.", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Save Banner (Create or Edit)
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      showToast("Validation Error", "Banner title is required.", "error");
      return;
    }

    if (!formImageUrl.trim()) {
      showToast("Validation Error", "Banner image is required.", "error");
      return;
    }

    if (formStartAt && formEndAt && new Date(formStartAt) > new Date(formEndAt)) {
      showToast("Validation Error", "Start date cannot be after end date.", "error");
      return;
    }

    setSubmitting(true);
    try {
      let finalImageUrl = formImageUrl.trim();

      // Fallback: If image URL is a raw base64 data URL, upload to storage first
      if (finalImageUrl.toLowerCase().startsWith("data:")) {
        const fetchBlob = await fetch(finalImageUrl);
        const blob = await fetchBlob.blob();
        const formData = new FormData();
        formData.append("file", blob, "banner.jpg");

        const uploadRes = await fetch("/api/admin/banners/upload", {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson.success || !uploadJson.data?.url) {
          throw new Error(uploadJson.error || "Unable to save the banner image. Please try again.");
        }
        finalImageUrl = uploadJson.data.url;
        setFormImageUrl(finalImageUrl);
      }

      const payload = {
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || null,
        description: formDescription.trim() || null,
        bannerType: formBannerType,
        imageUrl: finalImageUrl,
        imageClickUrl: formImageClickUrl.trim() || null,
        imageClickTarget: formImageClickTarget,
        ctaText: formCtaText.trim() || null,
        ctaUrl: formCtaUrl.trim() || null,
        placement: formPlacement,
        displayOrder: Number(formDisplayOrder) || 0,
        startAt: formStartAt ? new Date(formStartAt).toISOString() : null,
        endAt: formEndAt ? new Date(formEndAt).toISOString() : null,
        isActive: formIsActive,
      };

      if (editingBanner) {
        const res = await fetch("/api/admin/banners", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingBanner.id, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update banner.");
        showToast("Success", "Banner updated successfully.", "success");
      } else {
        const res = await fetch("/api/admin/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to create banner.");
        showToast("Success", "Banner created successfully.", "success");
      }

      setIsFormModalOpen(false);
      resetForm();
      fetchBanners();
    } catch (err: any) {
      showToast("Save Error", err.message || "Failed to save banner.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active/Inactive state
  const handleToggleActive = async (banner: PromotionalBanner) => {
    const nextState = !banner.isActive;
    // Optimistic UI update
    setBanners((prev) =>
      prev.map((b) => (b.id === banner.id ? { ...b, isActive: nextState } : b))
    );

    try {
      const res = await fetch("/api/admin/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: banner.id, isActive: nextState }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to toggle banner status.");
      showToast(
        "Status Updated",
        `Banner "${banner.title}" is now ${nextState ? "Active" : "Disabled"}.`,
        "success"
      );
    } catch (err: any) {
      // Revert optimistic update
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, isActive: !nextState } : b))
      );
      showToast("Error", err.message || "Failed to update status.", "error");
    }
  };

  // Delete Banner
  const handleDeleteBanner = async () => {
    if (!deleteConfirmBanner) return;
    const bannerId = deleteConfirmBanner.id;

    try {
      const res = await fetch(`/api/admin/banners?id=${bannerId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete banner.");

      setBanners((prev) => prev.filter((b) => b.id !== bannerId));
      showToast("Banner Deleted", "The banner has been permanently removed.", "success");
    } catch (err: any) {
      showToast("Delete Error", err.message || "Failed to delete banner.", "error");
    } finally {
      setDeleteConfirmBanner(null);
    }
  };

  // Fast order increment/decrement
  const handleOrderChange = async (banner: PromotionalBanner, delta: number) => {
    const newOrder = Math.max(0, banner.displayOrder + delta);
    if (newOrder === banner.displayOrder) return;

    setBanners((prev) =>
      prev.map((b) => (b.id === banner.id ? { ...b, displayOrder: newOrder } : b))
    );

    try {
      const res = await fetch("/api/admin/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: banner.id, displayOrder: newOrder }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
    } catch {
      fetchBanners();
    }
  };

  // Filtered banners list
  const filteredBanners = useMemo(() => {
    const now = new Date();
    return banners.filter((b) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          b.title.toLowerCase().includes(q) ||
          (b.subtitle && b.subtitle.toLowerCase().includes(q)) ||
          (b.description && b.description.toLowerCase().includes(q)) ||
          (b.imageClickUrl && b.imageClickUrl.toLowerCase().includes(q)) ||
          (b.ctaUrl && b.ctaUrl.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Status
      if (statusFilter === "ACTIVE") {
        if (!b.isActive) return false;
        if (b.startAt && new Date(b.startAt) > now) return false;
        if (b.endAt && new Date(b.endAt) < now) return false;
      } else if (statusFilter === "SCHEDULED") {
        if (!b.isActive || !b.startAt || new Date(b.startAt) <= now) return false;
      } else if (statusFilter === "EXPIRED") {
        if (!b.endAt || new Date(b.endAt) >= now) return false;
      } else if (statusFilter === "INACTIVE") {
        if (b.isActive) return false;
      }

      // Placement
      if (placementFilter !== "ALL" && b.placement !== "ALL" && b.placement !== placementFilter) {
        return false;
      }

      // Type
      if (typeFilter !== "ALL" && b.bannerType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [banners, searchQuery, statusFilter, placementFilter, typeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: banners.length,
      active: banners.filter((b) => {
        if (!b.isActive) return false;
        if (b.startAt && new Date(b.startAt) > now) return false;
        if (b.endAt && new Date(b.endAt) < now) return false;
        return true;
      }).length,
      scheduled: banners.filter((b) => b.isActive && b.startAt && new Date(b.startAt) > now).length,
      expiredOrInactive: banners.filter(
        (b) => !b.isActive || (b.endAt && new Date(b.endAt) < now)
      ).length,
    };
  }, [banners]);

  // Live preview mockup item for the modal
  const modalLiveBannerItem = useMemo(() => {
    return {
      id: "preview-modal-live",
      title: formTitle || "Promotional Banner Headline",
      subtitle: formSubtitle || "Special Offer Highlight",
      description:
        formDescription ||
        "Experience world-class learning with expert-led courses and personalized mentoring.",
      bannerType: formBannerType,
      imageUrl: formImageUrl || "/images/educonnects-owner-banner.jpeg",
      imageClickUrl: formImageClickUrl || null,
      imageClickTarget: formImageClickTarget,
      ctaText: formCtaText || "Explore Courses",
      ctaUrl: formCtaUrl || "/courses",
      placement: formPlacement,
      displayOrder: formDisplayOrder,
    };
  }, [
    formTitle,
    formSubtitle,
    formDescription,
    formBannerType,
    formImageUrl,
    formImageClickUrl,
    formImageClickTarget,
    formCtaText,
    formCtaUrl,
    formPlacement,
    formDisplayOrder,
  ]);

  return (
    <DashboardLayout role="ADMIN" userName={user?.name || "Admin"}>
      <div className="space-y-6 pb-12">
        {/* ========================================================================= */}
        {/* PAGE HEADER */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-50 text-[#0F5C5A]">
                <Sparkles className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Promotional Banners
              </h1>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl font-normal">
              Manage the global promotional banner carousel displayed before the Hero section across
              EduConnects Main, Learner, and Educator websites.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-[#0F5C5A] hover:bg-[#083F3D] shadow-md shadow-teal-900/20 text-sm transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Banner</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* STATS METRIC CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{stats.total}</div>
              <div className="text-xs font-semibold text-slate-500">Total Banners</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-700">{stats.active}</div>
              <div className="text-xs font-semibold text-emerald-600">Active Now</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-blue-700">{stats.scheduled}</div>
              <div className="text-xs font-semibold text-blue-600">Scheduled Ahead</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-rose-700">{stats.expiredOrInactive}</div>
              <div className="text-xs font-semibold text-slate-500">Expired / Inactive</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILTER & SEARCH TOOLBAR */}
        {/* ========================================================================= */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search banners by title, links, or copy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 focus:border-[#0F5C5A] text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Filters Cluster */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Now</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="EXPIRED">Expired</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {/* Placement Filter */}
            <select
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30"
            >
              <option value="ALL">All Placements</option>
              <option value="MAIN">Main Website</option>
              <option value="LEARNERS">Learner Website</option>
              <option value="EDUCATORS">Educator Website</option>
            </select>

            {/* Banner Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30"
            >
              <option value="ALL">All Banner Types</option>
              <option value="OFFER">Offer</option>
              <option value="PROMOTION">Promotion</option>
              <option value="ANNOUNCEMENT">Announcement</option>
              <option value="COURSE_PROMOTION">Course Promotion</option>
              <option value="EVENT">Event</option>
              <option value="GENERAL">General</option>
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BANNER ROSTER / TABLE */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#0F5C5A]" />
              <span className="text-sm font-semibold">Loading promotional banners...</span>
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No promotional banners found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL" || placementFilter !== "ALL"
                  ? "Try resetting your search or filter parameters."
                  : "Click 'Create Banner' above to launch your first promotional banner."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Banner</th>
                    <th className="py-3 px-4">Type & Placement</th>
                    <th className="py-3 px-4">Links & Click Action</th>
                    <th className="py-3 px-4">Schedule Window</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredBanners.map((banner) => {
                    const status = getBannerStatus(banner);
                    const hasClickUrl = Boolean(banner.imageClickUrl && banner.imageClickUrl.trim());

                    return (
                      <tr key={banner.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* 1. Display Order */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-700">
                              #{banner.displayOrder}
                            </span>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => handleOrderChange(banner, -1)}
                                title="Move earlier"
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded leading-none text-[10px]"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOrderChange(banner, 1)}
                                title="Move later"
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded leading-none text-[10px]"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 2. Banner Thumbnail & Copy */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-16 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                              <Image
                                src={banner.imageUrl}
                                alt={banner.title}
                                fill
                                className="object-cover"
                                unoptimized={banner.imageUrl.startsWith("http")}
                              />
                            </div>
                            <div className="max-w-xs">
                              <div className="font-bold text-slate-900 truncate" title={banner.title}>
                                {banner.title}
                              </div>
                              {banner.subtitle && (
                                <div className="text-xs text-slate-500 truncate" title={banner.subtitle}>
                                  {banner.subtitle}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Type & Placement */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                                {banner.bannerType}
                              </span>
                            </div>
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                                  banner.placement === "MAIN"
                                    ? "bg-teal-50 text-teal-800 border border-teal-200/60"
                                    : banner.placement === "LEARNERS"
                                    ? "bg-blue-50 text-blue-800 border border-blue-200/60"
                                    : banner.placement === "EDUCATORS"
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                                    : "bg-purple-50 text-purple-800 border border-purple-200/60"
                                }`}
                              >
                                <Globe className="h-2.5 w-2.5" />
                                <span>{banner.placement}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Links & Click Action */}
                        <td className="py-3.5 px-4 text-xs space-y-1 max-w-xs">
                          {/* Image Click Destination */}
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-slate-400 shrink-0 font-medium">Image:</span>
                            {hasClickUrl ? (
                              <span
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline truncate"
                                title={`Image links to: ${banner.imageClickUrl} (${banner.imageClickTarget})`}
                              >
                                <MousePointer className="h-3 w-3 text-blue-500 shrink-0" />
                                <span className="truncate">{banner.imageClickUrl}</span>
                                <span className="text-[10px] px-1 bg-blue-100 text-blue-700 rounded shrink-0">
                                  {banner.imageClickTarget === "_blank" ? "New Tab" : "Same"}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Not clickable</span>
                            )}
                          </div>

                          {/* CTA Destination */}
                          {banner.ctaUrl && (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-slate-400 shrink-0 font-medium">CTA:</span>
                              <span
                                className="inline-flex items-center gap-1 text-slate-700 truncate"
                                title={`${banner.ctaText} -> ${banner.ctaUrl}`}
                              >
                                <LinkIcon className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="font-semibold">{banner.ctaText}</span>
                                <span className="text-slate-400">({banner.ctaUrl})</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 5. Schedule Window */}
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap text-slate-600">
                          {banner.startAt || banner.endAt ? (
                            <div className="space-y-0.5">
                              <div>
                                <span className="text-slate-400">Start:</span>{" "}
                                {banner.startAt ? new Date(banner.startAt).toLocaleDateString() : "Immediate"}
                              </div>
                              <div>
                                <span className="text-slate-400">End:</span>{" "}
                                {banner.endAt ? new Date(banner.endAt).toLocaleDateString() : "Never"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Always visible</span>
                          )}
                        </td>

                        {/* 6. Active / Status Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(banner)}
                            title="Click to toggle banner active state"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${status.bg} ${status.color} ${status.border} hover:opacity-80`}
                          >
                            <Power className="h-3 w-3" />
                            <span>{status.label}</span>
                          </button>
                        </td>

                        {/* 7. Action Buttons */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewBanner(banner)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F5C5A] hover:bg-teal-50 transition-colors"
                              title="Preview banner"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(banner)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Duplicate banner"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(banner)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit banner"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmBanner(banner)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete banner"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CREATE / EDIT MODAL WITH REAL-TIME LIVE PREVIEW */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-50 text-[#0F5C5A]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {editingBanner ? "Edit Promotional Banner" : "Create Promotional Banner"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure banner copy, upload image, link routing, and view the live preview.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsFormModalOpen(false);
                  resetForm();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Two-column layout (Form Left, Live Preview Right) */}
            <form onSubmit={handleSaveBanner} className="flex-1 overflow-y-auto pt-6 space-y-6">
              {/* LIVE PREVIEW SECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-slate-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Live Banner Preview
                    </span>
                  </div>

                  {/* Theme Switcher Tabs for Preview */}
                  <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPreviewTheme("MAIN")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                        previewTheme === "MAIN"
                          ? "bg-[#0F5C5A] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Main Website
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTheme("LEARNERS")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                        previewTheme === "LEARNERS"
                          ? "bg-[#3157D5] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Learner Site
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTheme("EDUCATORS")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                        previewTheme === "EDUCATORS"
                          ? "bg-[#16805B] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Educator Site
                    </button>
                  </div>
                </div>

                {/* Rendered Preview Card */}
                <div className="rounded-2xl overflow-hidden bg-slate-900/5 p-2">
                  <PromotionalBannerCarousel
                    placement={previewTheme}
                    initialBanners={[modalLiveBannerItem as any]}
                    previewMode={true}
                  />
                </div>

                {/* Preview Clickability Explanation Note */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1 font-medium">
                    <MousePointer className="h-3 w-3 text-slate-400" />
                    {formImageClickUrl.trim() ? (
                      <span className="text-blue-600 font-semibold">
                        Image is clickable: clicking opens "{formImageClickUrl}" in{" "}
                        {formImageClickTarget === "_blank" ? "new tab" : "same tab"}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Image is not clickable</span>
                    )}
                  </span>
                  {formCtaUrl.trim() && (
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <LinkIcon className="h-3 w-3 text-slate-400" />
                      CTA opens: "{formCtaUrl}"
                    </span>
                  )}
                </div>
              </div>

              {/* FORM FIELDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Title */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>Banner Headline / Title</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    placeholder="e.g. Master IIT JEE with India's Top Verified Mentors"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900"
                  />
                </div>

                {/* 2. Subtitle / Discount Highlight */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Subtitle / Discount Tag
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="e.g. FLAT 25% OFF SELECTED COURSES"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900"
                  />
                </div>

                {/* 3. Banner Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Banner Type
                  </label>
                  <select
                    value={formBannerType}
                    onChange={(e) => setFormBannerType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900"
                  >
                    <option value="OFFER">Special Offer (Discount / Coupon)</option>
                    <option value="PROMOTION">Promotion (Feature Highlight)</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="COURSE_PROMOTION">Course Promotion</option>
                    <option value="EVENT">Event</option>
                    <option value="GENERAL">General Banner</option>
                  </select>
                </div>

                {/* 4. Description */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    placeholder="Engaging summary of the offer, program, or announcement..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900 resize-none"
                  />
                </div>

                {/* 5. IMAGE UPLOAD & IMAGE CLICK URL SECTION */}
                <div className="md:col-span-2 p-5 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-[#0F5C5A]" />
                    <h4 className="text-sm font-bold text-[#0F5C5A]">
                      Banner Image & Image Click Destination
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {/* Image Uploader & URL */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>Banner Image</span>
                        <span className="text-rose-500">*</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5" />
                              <span>Upload Image</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenCropModal}
                          disabled={!formImageUrl.trim()}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          title="Crop, zoom and position image to fit 3.2:1 banner ratio"
                        >
                          <Crop className="h-3.5 w-3.5" />
                          <span>Crop / Position Image</span>
                        </button>
                        <span className="text-xs text-slate-400">or enter image path/URL below</span>
                      </div>

                      <input
                        type="text"
                        required
                        placeholder="/images/educonnects-owner-banner.jpeg or https://..."
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900"
                      />
                    </div>

                    {/* Image Click URL & Target Option */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>Image Click URL (Optional)</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          — users can click anywhere on the image
                        </span>
                      </label>

                      <input
                        type="text"
                        placeholder="e.g. /courses or https://example.com"
                        value={formImageClickUrl}
                        onChange={(e) => setFormImageClickUrl(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900"
                      />

                      {/* Open Link Radio Options */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500 font-medium">Open Image Link In:</span>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="imageClickTarget"
                              value="_self"
                              checked={formImageClickTarget === "_self"}
                              onChange={() => setFormImageClickTarget("_self")}
                              className="text-[#0F5C5A] focus:ring-[#0F5C5A]"
                            />
                            <span className="font-semibold text-slate-700">Same Tab</span>
                          </label>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="imageClickTarget"
                              value="_blank"
                              checked={formImageClickTarget === "_blank"}
                              onChange={() => setFormImageClickTarget("_blank")}
                              className="text-[#0F5C5A] focus:ring-[#0F5C5A]"
                            />
                            <span className="font-semibold text-slate-700">New Tab</span>
                          </label>
                        </div>
                      </div>

                      {/* Explicit Clickability Hint */}
                      <div className="text-[11px] pt-0.5">
                        {formImageClickUrl.trim() ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Image is clickable. Clicking anywhere on the banner image opens this link.
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">
                            Image is not clickable. Leave empty if no destination is needed.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. CTA BUTTON CONFIGURATION */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    CTA Button Text (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="e.g. Explore Courses, Claim Offer"
                    value={formCtaText}
                    onChange={(e) => setFormCtaText(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    CTA Button URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /courses or /teacher/register"
                    value={formCtaUrl}
                    onChange={(e) => setFormCtaUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900 font-mono text-xs"
                  />
                </div>

                {/* 7. PLACEMENT & DISPLAY ORDER */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Website Placement
                  </label>
                  <select
                    value={formPlacement}
                    onChange={(e) => setFormPlacement(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900"
                  >
                    <option value="ALL">All Websites (Main, Learner, Educator)</option>
                    <option value="MAIN">Main Website Only (educonnects.co.in)</option>
                    <option value="LEARNERS">Learner Website Only (learners.educonnects.co.in)</option>
                    <option value="EDUCATORS">Educator Website Only (educators.educonnects.co.in)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Display Order (Lower numbers appear first)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900"
                  />
                </div>

                {/* 8. SCHEDULE WINDOW (START & END DATES) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Start Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formStartAt}
                    onChange={(e) => setFormStartAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    End Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formEndAt}
                    onChange={(e) => setFormEndAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5C5A]/30 text-slate-900"
                  />
                </div>

                {/* 9. ACTIVE CHECKBOX */}
                <div className="md:col-span-2 pt-2">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="h-4 w-4 rounded text-[#0F5C5A] focus:ring-[#0F5C5A]"
                    />
                    <span className="text-sm font-bold text-slate-800">
                      Active (Display in carousel when schedule conditions are satisfied)
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    resetForm();
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#0F5C5A] hover:bg-[#083F3D] shadow-md text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingBanner ? "Update Banner" : "Save & Publish"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STANDALONE PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-black text-slate-900">Banner Live Showcase</h3>
                <p className="text-xs text-slate-500">
                  Preview how "{previewBanner.title}" looks with native website themes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewBanner(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Theme tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewTheme("MAIN")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  previewTheme === "MAIN"
                    ? "bg-[#0F5C5A] text-white shadow-md"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Main Website Theme
              </button>
              <button
                type="button"
                onClick={() => setPreviewTheme("LEARNERS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  previewTheme === "LEARNERS"
                    ? "bg-[#3157D5] text-white shadow-md"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Learner Website Theme
              </button>
              <button
                type="button"
                onClick={() => setPreviewTheme("EDUCATORS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  previewTheme === "EDUCATORS"
                    ? "bg-[#16805B] text-white shadow-md"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Educator Website Theme
              </button>
            </div>

            {/* Rendered Preview Carousel */}
            <div className="rounded-3xl overflow-hidden bg-slate-950/5 p-3">
              <PromotionalBannerCarousel
                placement={previewTheme}
                initialBanners={[previewBanner as any]}
                previewMode={true}
              />
            </div>

            {/* Details Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Image Click URL</span>
                <span className="font-bold text-slate-800">
                  {previewBanner.imageClickUrl || "None (Not clickable)"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Link Target</span>
                <span className="font-bold text-slate-800">
                  {previewBanner.imageClickTarget === "_blank" ? "New Tab (_blank)" : "Same Tab (_self)"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">CTA Action</span>
                <span className="font-bold text-slate-800">
                  {previewBanner.ctaText ? `${previewBanner.ctaText} -> ${previewBanner.ctaUrl}` : "None"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Placement Rule</span>
                <span className="font-bold text-slate-800">{previewBanner.placement}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewBanner(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
              >
                Close Showcase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {deleteConfirmBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-rose-50 text-rose-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Banner?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete promotional banner{" "}
              <strong className="text-slate-900">"{deleteConfirmBanner.title}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmBanner(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBanner}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CROP & POSITION IMAGE MODAL */}
      {/* ========================================================================= */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-50 text-[#0F5C5A]">
                  <Crop className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Crop & Position Banner Image
                  </h3>
                  <p className="text-xs text-slate-500">
                    Drag, zoom and position your image to fit the website's exact 3.2:1 banner ratio with 0 side gaps.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Interactive Crop Viewport Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1">
                  <Move className="h-3.5 w-3.5 text-teal-600" />
                  <span>Drag image to position • Scroll/Slider to zoom</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[#0F5C5A] border border-teal-200 text-[11px]">
                  Aspect Ratio: 3.2 : 1 (1280 × 400px)
                </span>
              </div>

              {/* Viewport Frame */}
              <div
                ref={cropViewportRef}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={handleCropMouseUp}
                onTouchStart={handleCropTouchStart}
                onTouchMove={handleCropTouchMove}
                onTouchEnd={handleCropTouchEnd}
                onWheel={handleCropWheel}
                className="relative w-full aspect-[3.2/1] bg-slate-950 overflow-hidden rounded-2xl border-2 border-dashed border-teal-400 shadow-xl cursor-grab active:cursor-grabbing select-none flex items-center justify-center touch-none"
              >
                {/* Image under transformation */}
                {cropSrc && (
                  <img
                    ref={cropImageRef}
                    src={cropSrc}
                    alt="Crop workspace"
                    draggable={false}
                    onLoad={handleCropImageLoad}
                    style={{
                      width: cropGeometry.dispW ? `${cropGeometry.dispW}px` : "auto",
                      height: cropGeometry.dispH ? `${cropGeometry.dispH}px` : "auto",
                      maxWidth: "none",
                      maxHeight: "none",
                      transform: `translate3d(${cropGeometry.clampedX}px, ${cropGeometry.clampedY}px, 0px)`,
                    }}
                    className="absolute select-none pointer-events-none transition-transform duration-75"
                    crossOrigin="anonymous"
                  />
                )}

                {/* Crop Alignment Grid Overlay */}
                <div className="absolute inset-0 border border-white/20 pointer-events-none grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/10" />
                  <div className="border-r border-b border-white/10" />
                  <div className="border-b border-white/10" />
                  <div className="border-r border-b border-white/10" />
                  <div className="border-r border-b border-white/10" />
                  <div className="border-b border-white/10" />
                  <div className="border-r border-white/10" />
                  <div className="border-r border-white/10" />
                  <div />
                </div>
              </div>
            </div>

            {/* Controls: Two-way Zoom slider & Reset Position */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                <span className="text-xs font-bold text-slate-700 shrink-0">Zoom:</span>

                {/* Zoom Out Button (-) */}
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={cropZoom <= 1.001}
                  title="Zoom Out (-)"
                  aria-label="Zoom Out"
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  <Minus className="h-4 w-4" />
                </button>

                {/* Zoom Range Slider */}
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.02"
                  value={cropZoom}
                  onChange={handleZoomSliderChange}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0F5C5A]"
                />

                {/* Zoom In Button (+) */}
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={cropZoom >= 3.999}
                  title="Zoom In (+)"
                  aria-label="Zoom In"
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {/* Formatted Zoom Readout */}
                <span className="text-xs font-mono font-bold text-slate-700 shrink-0 w-12 text-right">
                  {cropZoom.toFixed(2)}x
                </span>
              </div>

              {/* Reset Position Button */}
              <button
                type="button"
                onClick={handleResetCropPosition}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Position</span>
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isCropping}
                onClick={() => setIsCropModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isCropping}
                onClick={handleApplyCrop}
                className="px-6 py-2.5 rounded-xl bg-[#0F5C5A] hover:bg-[#0D4E4C] text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCropping ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Cropped Image...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Apply Crop & Save Image</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
