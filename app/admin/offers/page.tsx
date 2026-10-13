"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuthPermissions } from "@/components/shared/permission-guard";
import { useToast } from "@/components/ui/toast";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
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
} from "lucide-react";

export interface Offer {
  id: string;
  code?: string | null;
  title: string;
  description: string | null;
  discountText: string | null;
  discountType?: string;
  discountValue?: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount?: number;
  ctaText: string | null;
  ctaLink: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  targetAudience: string; // ALL | MAIN | LEARNERS | EDUCATORS
  createdAt: string;
  updatedAt: string;
}

export default function AdminOffersPage() {
  const { user } = useAuthPermissions();
  const { showToast } = useToast();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SCHEDULED" | "EXPIRED" | "INACTIVE">("ALL");

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [previewOffer, setPreviewOffer] = useState<Offer | null>(null);
  const [deleteConfirmOffer, setDeleteConfirmOffer] = useState<Offer | null>(null);

  // Form inputs
  const [formTitle, setFormTitle] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDiscountText, setFormDiscountText] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [formDiscountValue, setFormDiscountValue] = useState<number | string>("");
  const [formUsageLimit, setFormUsageLimit] = useState<number | string>("");
  const [formMinOrderAmount, setFormMinOrderAmount] = useState<number | string>("");
  const [formCtaText, setFormCtaText] = useState("Explore Now");
  const [formCtaLink, setFormCtaLink] = useState("/courses");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formTargetAudience, setFormTargetAudience] = useState("ALL");
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewTab, setPreviewTab] = useState<"MAIN" | "LEARNERS" | "EDUCATORS">("MAIN");

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/offers");
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.offers)) {
        setOffers(json.data.offers);
      }
    } catch (err: any) {
      showToast("Error", "Failed to load offers.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const getOfferStatus = (offer: Offer): { label: string; color: string; bg: string; border: string } => {
    const now = new Date();
    if (!offer.isActive) {
      return {
        label: "Inactive",
        color: "text-slate-600",
        bg: "bg-slate-100",
        border: "border-slate-200",
      };
    }
    if (offer.startDate && new Date(offer.startDate) > now) {
      return {
        label: "Scheduled",
        color: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
      };
    }
    if (offer.endDate && new Date(offer.endDate) < now) {
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

  const handleOpenCreate = () => {
    setEditingOffer(null);
    setFormTitle("");
    setFormCode("");
    setFormDescription("");
    setFormDiscountText("");
    setFormDiscountType("PERCENTAGE");
    setFormDiscountValue("");
    setFormUsageLimit("");
    setFormMinOrderAmount("");
    setFormCtaText("Explore Now");
    setFormCtaLink("/courses");
    setFormStartDate("");
    setFormEndDate("");
    setFormTargetAudience("ALL");
    setFormIsActive(true);
    setPreviewTab("MAIN");
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormTitle(offer.title);
    setFormCode(offer.code || "");
    setFormDescription(offer.description || "");
    setFormDiscountText(offer.discountText || "");
    setFormDiscountType((offer.discountType as any) || "PERCENTAGE");
    setFormDiscountValue(offer.discountValue !== undefined && offer.discountValue !== null ? offer.discountValue : "");
    setFormUsageLimit(offer.usageLimit !== null && offer.usageLimit !== undefined ? offer.usageLimit : "");
    setFormMinOrderAmount(offer.minOrderAmount !== null && offer.minOrderAmount !== undefined ? offer.minOrderAmount : "");
    setFormCtaText(offer.ctaText || "Explore Now");
    setFormCtaLink(offer.ctaLink || "/courses");
    setFormStartDate(offer.startDate ? offer.startDate.slice(0, 16) : "");
    setFormEndDate(offer.endDate ? offer.endDate.slice(0, 16) : "");
    setFormTargetAudience(offer.targetAudience || "ALL");
    setFormIsActive(offer.isActive);
    setPreviewTab("MAIN");
    setIsFormModalOpen(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("Validation Error", "Offer title is required.", "error");
      return;
    }

    if (formStartDate && formEndDate && new Date(formStartDate) > new Date(formEndDate)) {
      showToast("Validation Error", "Start date cannot be after end date.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        code: formCode.trim().toUpperCase() || null,
        description: formDescription.trim() || null,
        discountText: formDiscountText.trim() || null,
        discountType: formDiscountType,
        discountValue: formDiscountValue !== "" ? Number(formDiscountValue) : 0,
        usageLimit: formUsageLimit !== "" ? parseInt(String(formUsageLimit), 10) : null,
        minOrderAmount: formMinOrderAmount !== "" ? Number(formMinOrderAmount) : null,
        ctaText: formCtaText.trim() || "Explore Now",
        ctaLink: formCtaLink.trim() || "/courses",
        startDate: formStartDate ? new Date(formStartDate).toISOString() : null,
        endDate: formEndDate ? new Date(formEndDate).toISOString() : null,
        targetAudience: formTargetAudience,
        isActive: formIsActive,
      };

      if (editingOffer) {
        const res = await fetch("/api/admin/offers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingOffer.id, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update offer.");
        showToast("Success", "Offer updated successfully.", "success");
      } else {
        const res = await fetch("/api/admin/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to create offer.");
        showToast("Success", "Offer created successfully.", "success");
      }

      setIsFormModalOpen(false);
      fetchOffers();
    } catch (err: any) {
      showToast("Error", err.message || "Operation failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    const nextState = !offer.isActive;
    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, isActive: nextState } : o))
    );

    try {
      const res = await fetch("/api/admin/offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offer.id, isActive: nextState }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to toggle offer status.");
      showToast(
        "Status Updated",
        `Offer "${offer.title}" is now ${nextState ? "Active" : "Disabled"}.`,
        "success"
      );
    } catch (err: any) {
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, isActive: !nextState } : o))
      );
      showToast("Error", err.message || "Failed to update status.", "error");
    }
  };

  const handleDeleteOffer = async () => {
    if (!deleteConfirmOffer) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/offers?id=${deleteConfirmOffer.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete offer.");
      showToast("Success", "Offer permanently deleted.", "success");
      setDeleteConfirmOffer(null);
      fetchOffers();
    } catch (err: any) {
      showToast("Error", err.message || "Failed to delete offer.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics calculation
  const now = new Date();
  const totalCount = offers.length;
  const activeCount = offers.filter((o) => {
    if (!o.isActive) return false;
    if (o.startDate && new Date(o.startDate) > now) return false;
    if (o.endDate && new Date(o.endDate) < now) return false;
    return true;
  }).length;
  const scheduledCount = offers.filter(
    (o) => o.isActive && o.startDate && new Date(o.startDate) > now
  ).length;
  const expiredCount = offers.filter(
    (o) => o.endDate && new Date(o.endDate) < now
  ).length;

  // Filtered offers
  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (offer.discountText && offer.discountText.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (offer.description && offer.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      offer.targetAudience.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const status = getOfferStatus(offer).label.toUpperCase();
    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIVE") return status === "ACTIVE";
    if (statusFilter === "SCHEDULED") return status === "SCHEDULED";
    if (statusFilter === "EXPIRED") return status === "EXPIRED";
    if (statusFilter === "INACTIVE") return status === "INACTIVE";
    return true;
  });

  return (
    <DashboardLayout
      role="ADMIN"
      userName={user?.name || "System Administrator"}
      userEmail={user?.email || undefined}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Tag className="h-6 w-6 text-teal-600" />
              <span>Global Offers & Campaigns</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Create, schedule, and manage promotional offers displayed with theme-adaptive banners across all 3 EduConnects platforms.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Offer</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{totalCount}</div>
              <div className="text-[11px] text-slate-500 font-medium">Total Campaigns</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
              <div className="text-[11px] text-slate-500 font-medium">Live on Websites</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-blue-600">{scheduledCount}</div>
              <div className="text-[11px] text-slate-500 font-medium">Scheduled Campaigns</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-rose-600">{expiredCount}</div>
              <div className="text-[11px] text-slate-500 font-medium">Expired Campaigns</div>
            </div>
          </div>
        </div>

        {/* Toolbar: Search and Filter */}
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full sm:w-80">
            <Search className="h-4 w-4 text-slate-400 ml-2 shrink-0" />
            <input
              type="text"
              placeholder="Search by title, discount, audience..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs text-slate-800 placeholder:text-slate-400 bg-transparent outline-none font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(["ALL", "ACTIVE", "SCHEDULED", "EXPIRED", "INACTIVE"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all shrink-0 cursor-pointer ${
                  statusFilter === filter
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {filter === "ALL" ? "All Offers" : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Offers Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              <span className="text-xs font-semibold">Loading campaigns...</span>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Tag className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No campaigns found</p>
              <p className="text-xs text-slate-400">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try adjusting your search or filters."
                  : "Click Create New Offer to launch your first promotional banner."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Offer Campaign</th>
                    <th className="py-3 px-4">Discount Badge</th>
                    <th className="py-3 px-4">Target Website</th>
                    <th className="py-3 px-4">Timeline</th>
                    <th className="py-3 px-4">CTA Link</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOffers.map((offer) => {
                    const status = getOfferStatus(offer);
                    return (
                      <tr key={offer.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 truncate">{offer.title}</div>
                          {offer.description && (
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {offer.description}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {offer.discountText ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/70">
                                <Flame className="h-3 w-3 text-amber-600" />
                                <span>{offer.discountText}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                            {offer.code && (
                              <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-blue-700">
                                <Tag className="h-3 w-3 text-blue-600" />
                                <span>CODE: {offer.code}</span>
                                {offer.discountValue ? (
                                  <span className="text-slate-500 font-sans font-normal text-[10px]">
                                    ({offer.discountType === "FIXED" ? `₹${offer.discountValue} OFF` : `${offer.discountValue}% OFF`})
                                  </span>
                                ) : null}
                              </div>
                            )}
                            {offer.usageLimit !== null && offer.usageLimit !== undefined ? (
                              <div className="text-[10px] text-slate-500 font-sans">
                                Uses: {offer.usedCount || 0} / {offer.usageLimit}
                              </div>
                            ) : offer.usedCount ? (
                              <div className="text-[10px] text-slate-500 font-sans">
                                Uses: {offer.usedCount}
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                            <Globe className="h-3 w-3 text-slate-500" />
                            <span>
                              {offer.targetAudience === "ALL"
                                ? "All 3 Websites"
                                : offer.targetAudience === "MAIN"
                                ? "Main Website"
                                : offer.targetAudience === "LEARNERS"
                                ? "Learner Website"
                                : "Educator Website"}
                            </span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>
                              {offer.startDate ? new Date(offer.startDate).toLocaleDateString() : "Immediate"}
                              {" → "}
                              {offer.endDate ? new Date(offer.endDate).toLocaleDateString() : "Ongoing"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                              {offer.ctaText || "Explore"}
                            </span>
                            <span className="text-slate-400 text-[10px]">({offer.ctaLink || "/"})</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(offer)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${status.border} ${status.bg} ${status.color}`}
                            title={`Click to ${offer.isActive ? "Deactivate" : "Activate"}`}
                          >
                            <Power className="h-3 w-3" />
                            <span>{status.label}</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewOffer(offer)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                              title="Live Theme Preview"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(offer)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Offer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmOffer(offer)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Offer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

        {/* Modal: Create or Edit Offer */}
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                    <Tag className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingOffer ? "Edit Promotional Offer" : "Create New Promotional Offer"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveOffer} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Offer Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grand Opening Special: Flat 50% Off All Live Classes!"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                    />
                  </div>

                  {/* Discount Text */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Discount / Badge Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FLAT 90% OFF (CODE: 900FF)"
                      value={formDiscountText}
                      onChange={(e) => setFormDiscountText(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                    />
                  </div>

                  {/* Promo / Coupon Code */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Offer / Coupon Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 900FF, EDU40, FLAT50"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono font-bold tracking-wider"
                    />
                  </div>

                  {/* Discount Calculation Type & Value */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Discount Type
                      </label>
                      <select
                        value={formDiscountType}
                        onChange={(e) => setFormDiscountType(e.target.value as any)}
                        className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium cursor-pointer"
                      >
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED">Fixed Amount (₹)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {formDiscountType === "PERCENTAGE" ? "Discount (%)" : "Discount (₹)"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={formDiscountType === "PERCENTAGE" ? 100 : undefined}
                        placeholder={formDiscountType === "PERCENTAGE" ? "e.g. 90 for 90%" : "e.g. 500 for ₹500"}
                        value={formDiscountValue}
                        onChange={(e) => setFormDiscountValue(e.target.value)}
                        className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                    </div>
                  </div>

                  {/* Usage Limit & Min Purchase */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Usage Limit (Optional)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 100 (Blank = Unlimited)"
                        value={formUsageLimit}
                        onChange={(e) => setFormUsageLimit(e.target.value)}
                        className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Min Order Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 499 (Blank = None)"
                        value={formMinOrderAmount}
                        onChange={(e) => setFormMinOrderAmount(e.target.value)}
                        className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                    </div>
                  </div>

                  {/* Target Website */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Target Website / Platform
                    </label>
                    <select
                      value={formTargetAudience}
                      onChange={(e) => setFormTargetAudience(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium cursor-pointer"
                    >
                      <option value="ALL">All 3 Websites (Global Campaign)</option>
                      <option value="MAIN">Main Website (educonnects.co.in)</option>
                      <option value="LEARNERS">Learner Website (learners.educonnects.co.in)</option>
                      <option value="EDUCATORS">Educator Website (educators.educonnects.co.in)</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Elevate your skills with India's top educators. Valid on all video courses and 1-on-1 slots."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium resize-none"
                    />
                  </div>

                  {/* CTA Text */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Claim Offer, Enroll Now"
                      value={formCtaText}
                      onChange={(e) => setFormCtaText(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                    />
                  </div>

                  {/* CTA Link */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      CTA Link URL
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. /courses, /find-teachers, /pricing"
                      value={formCtaLink}
                      onChange={(e) => setFormCtaLink(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                    />
                  </div>

                  {/* Start Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Start Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      End Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                    />
                  </div>
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer"
                  />
                  <label
                    htmlFor="isActiveCheck"
                    className="text-xs font-bold text-slate-800 cursor-pointer select-none"
                  >
                    Activate Campaign Immediately
                  </label>
                </div>

                {/* Live Preview Box Inside Modal */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      <span>Live Theme Preview</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {(["MAIN", "LEARNERS", "EDUCATORS"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setPreviewTab(tab)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                            previewTab === tab
                              ? tab === "MAIN"
                                ? "bg-teal-700 text-white"
                                : tab === "LEARNERS"
                                ? "bg-blue-600 text-white"
                                : "bg-emerald-600 text-white"
                              : "text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {tab === "MAIN" ? "Main" : tab === "LEARNERS" ? "Learner" : "Educator"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Render Mock Card */}
                  <div
                    className={`p-4 rounded-2xl border shadow-lg text-white transition-all ${
                      previewTab === "MAIN"
                        ? "bg-gradient-to-br from-[#083F3D] to-[#0F5C5A] border-[#1B6863]/50"
                        : previewTab === "LEARNERS"
                        ? "bg-gradient-to-br from-[#0D5C41] to-[#16805B] border-[#A7F3D0]/30"
                        : "bg-gradient-to-br from-[#0D5C41] to-[#16805B] border-[#A7F3D0]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          previewTab === "MAIN"
                            ? "bg-[#F2C14E] text-[#083F3D]"
                            : previewTab === "LEARNERS"
                            ? "bg-emerald-200 text-[#0D5C41]"
                            : "bg-emerald-200 text-[#0D5C41]"
                        }`}
                      >
                        {formDiscountText || "SPECIAL OFFER"}
                      </span>
                      <span className="text-[10px] text-white/70 font-mono">
                        {previewTab === "MAIN"
                          ? "educonnects.co.in"
                          : previewTab === "LEARNERS"
                          ? "learners.educonnects.co.in"
                          : "educators.educonnects.co.in"}
                      </span>
                    </div>
                    <div className="font-bold text-sm leading-snug">
                      {formTitle || "Sample Offer Title Here"}
                    </div>
                    {formDescription && (
                      <div className="text-xs text-white/80 mt-1 line-clamp-2">
                        {formDescription}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-white/70">
                        {formEndDate ? `Expires ${new Date(formEndDate).toLocaleDateString()}` : "Limited Time"}
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-xl shadow-xs inline-flex items-center gap-1 ${
                          previewTab === "MAIN"
                            ? "bg-[#F2C14E] text-[#083F3D]"
                            : previewTab === "LEARNERS"
                            ? "bg-white text-[#0D5C41]"
                            : "bg-white text-[#0D5C41]"
                        }`}
                      >
                        <span>{formCtaText || "Claim Offer"}</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{editingOffer ? "Save Changes" : "Create Campaign"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Live Theme Preview Full Drawer */}
        {previewOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-teal-600" />
                  <span>Interactive Multi-Theme Preview</span>
                </h3>
                <button
                  onClick={() => setPreviewOffer(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                This shows exactly how the offer card adapts its palette to match the Main, Learner, and Educator websites.
              </p>

              <div className="space-y-4">
                {/* 1. Main Website */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#083F3D] to-[#0F5C5A] border border-[#1B6863]/50 text-white shadow-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#F2C14E] text-[#083F3D]">
                      {previewOffer.discountText || "MAIN WEBSITE THEME"}
                    </span>
                    <span className="text-[10px] text-teal-200 font-mono">educonnects.co.in</span>
                  </div>
                  <div className="font-bold text-sm">{previewOffer.title}</div>
                  {previewOffer.description && (
                    <div className="text-xs text-teal-100/90 mt-1">{previewOffer.description}</div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-teal-200/80">
                      {previewOffer.endDate ? `Valid until ${new Date(previewOffer.endDate).toLocaleDateString()}` : "Active"}
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-[#F2C14E] text-[#083F3D] shadow-xs flex items-center gap-1">
                      <span>{previewOffer.ctaText || "Claim Offer"}</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>

                {/* 2. Learner Website */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0D5C41] to-[#16805B] border border-[#A7F3D0]/30 text-white shadow-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-[#0D5C41]">
                      {previewOffer.discountText || "LEARNER THEME"}
                    </span>
                    <span className="text-[10px] text-emerald-200 font-mono">learners.educonnects.co.in</span>
                  </div>
                  <div className="font-bold text-sm">{previewOffer.title}</div>
                  {previewOffer.description && (
                    <div className="text-xs text-emerald-100/90 mt-1">{previewOffer.description}</div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-200/80">
                      {previewOffer.endDate ? `Valid until ${new Date(previewOffer.endDate).toLocaleDateString()}` : "Active"}
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-white text-[#0D5C41] shadow-xs flex items-center gap-1">
                      <span>{previewOffer.ctaText || "Claim Offer"}</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>

                {/* 3. Educator Website */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0D5C41] to-[#16805B] border border-[#A7F3D0]/30 text-white shadow-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-[#0D5C41]">
                      {previewOffer.discountText || "EDUCATOR THEME"}
                    </span>
                    <span className="text-[10px] text-emerald-200 font-mono">educators.educonnects.co.in</span>
                  </div>
                  <div className="font-bold text-sm">{previewOffer.title}</div>
                  {previewOffer.description && (
                    <div className="text-xs text-emerald-100/90 mt-1">{previewOffer.description}</div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-200/80">
                      {previewOffer.endDate ? `Valid until ${new Date(previewOffer.endDate).toLocaleDateString()}` : "Active"}
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-white text-[#0D5C41] shadow-xs flex items-center gap-1">
                      <span>{previewOffer.ctaText || "Claim Offer"}</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPreviewOffer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirmation */}
        {deleteConfirmOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold mx-auto">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900">Delete Promotional Offer?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-slate-800">"{deleteConfirmOffer.title}"</strong>? This will remove it from all websites immediately.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOffer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOffer}
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Delete Offer</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
