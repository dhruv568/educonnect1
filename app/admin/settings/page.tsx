"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { GlassButton } from "@/components/glass/glass-button";
import { Settings, Percent, Layers, Shield, Save, Loader2, Plus, Check, Building2, Phone, FileText, Share2, MessageSquare, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { OFFICIAL_COMPANY_INFO } from "@/lib/company";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "company" | "social" | "commission" | "categories" | "whatsapp">("general");

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    siteName: "EduConnects",
    supportEmail: "support@educonnects.com",
    allowRegistration: true,
    requireTeacherApproval: true,
    maintenanceMode: false,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // WhatsApp Automation Settings State
  const [whatsappSettings, setWhatsappSettings] = useState({
    enabled: true,
    phoneNumberId: "",
    businessAccountId: "",
    isApiConfigured: false,
    notifications: {
      PAYMENT_SUCCESS: true,
      PAYMENT_FAILED: true,
      PAYMENT_RECEIPT: true,
      REFUND_REQUESTED: true,
      REFUND_APPROVED: true,
      REFUND_COMPLETED: true,
      REFUND_REJECTED: true,
      LEARNER_REGISTRATION: true,
      EDUCATOR_REGISTRATION: true,
      EDUCATOR_VERIFIED: true,
      EDUCATOR_VERIFICATION_PENDING: true,
      EDUCATOR_REJECTED: true,
      COURSE_ENROLLED: true,
      BOOKING_CONFIRMED: true,
      CLASS_REMINDER: true,
      CLASS_CANCELLED: true,
    },
    templateMapping: {
      PAYMENT_SUCCESS: "edu_payment_success",
      PAYMENT_FAILED: "edu_stu_payment_failed",
      PAYMENT_FAILED_TEACHER: "edu_teacher_payment_failed",
      PAYMENT_RECEIPT: "edu_payment_receipt",
      REFUND_REQUESTED: "edu_refund_requested",
      REFUND_APPROVED: "edu_refund_approved",
      REFUND_COMPLETED: "edu_refund_completed",
      REFUND_REJECTED: "edu_refund_rejected",
      LEARNER_REGISTRATION: "edu_learner_welcome",
      EDUCATOR_REGISTRATION: "edu_teacher_welcome",
      EDUCATOR_VERIFIED: "edu_teacher_verified",
      EDUCATOR_VERIFICATION_PENDING: "edu_teacher_pending",
      EDUCATOR_REJECTED: "edu_teacher_rejected",
      COURSE_ENROLLED: "edu_course_enrolled",
      BOOKING_CONFIRMED: "edu_booking_confirmed",
      CLASS_REMINDER: "edu_class_reminder",
      CLASS_CANCELLED: "edu_class_cancelled",
    },
  });
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  // Company Profile Settings State
  const [companySettings, setCompanySettings] = useState({
    brandName: OFFICIAL_COMPANY_INFO.brandName,
    legalName: OFFICIAL_COMPANY_INFO.legalName,
    cin: OFFICIAL_COMPANY_INFO.cin,
    pan: OFFICIAL_COMPANY_INFO.pan,
    founder: OFFICIAL_COMPANY_INFO.founder,
    authorizedSignatory: OFFICIAL_COMPANY_INFO.authorizedSignatory,
    registeredAddress: OFFICIAL_COMPANY_INFO.registeredAddress,
    website: OFFICIAL_COMPANY_INFO.website,
    tagline: OFFICIAL_COMPANY_INFO.tagline,
    governingLaw: OFFICIAL_COMPANY_INFO.governingLaw,
    whatsappNumber: OFFICIAL_COMPANY_INFO.whatsappNumber,
    refundPeriod: OFFICIAL_COMPANY_INFO.refundPeriod,
    pricingRange: OFFICIAL_COMPANY_INFO.pricingRange,
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // Social Media Links State
  const [socialSettings, setSocialSettings] = useState({
    youtubeUrl: OFFICIAL_COMPANY_INFO.socials.youtube,
    facebookUrl: OFFICIAL_COMPANY_INFO.socials.facebook,
    instagramUrl: OFFICIAL_COMPANY_INFO.socials.instagram,
    linkedinUrl: OFFICIAL_COMPANY_INFO.socials.linkedin,
    whatsappUrl: OFFICIAL_COMPANY_INFO.socials.whatsapp || OFFICIAL_COMPANY_INFO.whatsappUrl,
  });
  const [savingSocial, setSavingSocial] = useState(false);
  const [socialError, setSocialError] = useState("");

  // Commission Settings State
  const [commissionRate, setCommissionRate] = useState(15.0);
  const [savingCommission, setSavingCommission] = useState(false);

  // Categories State
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCommission();
    fetchCategories();
  }, []);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (json.data) {
        setGeneralSettings({
          siteName: json.data.siteName || "EduConnects",
          supportEmail: json.data.supportEmail || "support@educonnects.com",
          allowRegistration: json.data.allowRegistration ?? true,
          requireTeacherApproval: json.data.requireTeacherApproval ?? true,
          maintenanceMode: json.data.maintenanceMode ?? false,
        });

        setCompanySettings({
          brandName: json.data.brandName || OFFICIAL_COMPANY_INFO.brandName,
          legalName: json.data.legalName || OFFICIAL_COMPANY_INFO.legalName,
          cin: json.data.cin || OFFICIAL_COMPANY_INFO.cin,
          pan: json.data.pan || OFFICIAL_COMPANY_INFO.pan,
          founder: json.data.founder || OFFICIAL_COMPANY_INFO.founder,
          authorizedSignatory: json.data.authorizedSignatory || OFFICIAL_COMPANY_INFO.authorizedSignatory,
          registeredAddress: json.data.registeredAddress || OFFICIAL_COMPANY_INFO.registeredAddress,
          website: json.data.website || OFFICIAL_COMPANY_INFO.website,
          tagline: json.data.tagline || OFFICIAL_COMPANY_INFO.tagline,
          governingLaw: json.data.governingLaw || OFFICIAL_COMPANY_INFO.governingLaw,
          whatsappNumber: json.data.whatsappNumber || OFFICIAL_COMPANY_INFO.whatsappNumber,
          refundPeriod: json.data.refundPeriod || OFFICIAL_COMPANY_INFO.refundPeriod,
          pricingRange: json.data.pricingRange || OFFICIAL_COMPANY_INFO.pricingRange,
        });

        setSocialSettings({
          youtubeUrl: json.data.youtubeUrl !== undefined ? json.data.youtubeUrl : OFFICIAL_COMPANY_INFO.socials.youtube,
          facebookUrl: json.data.facebookUrl !== undefined ? json.data.facebookUrl : OFFICIAL_COMPANY_INFO.socials.facebook,
          instagramUrl: json.data.instagramUrl !== undefined ? json.data.instagramUrl : OFFICIAL_COMPANY_INFO.socials.instagram,
          linkedinUrl: json.data.linkedinUrl !== undefined ? json.data.linkedinUrl : OFFICIAL_COMPANY_INFO.socials.linkedin,
          whatsappUrl: json.data.whatsappUrl !== undefined ? json.data.whatsappUrl : (OFFICIAL_COMPANY_INFO.socials.whatsapp || OFFICIAL_COMPANY_INFO.whatsappUrl),
        });

        setWhatsappSettings((prev) => ({
          ...prev,
          enabled: json.data.whatsappEnabled !== false,
          phoneNumberId: json.data.whatsappPhoneNumberId || "",
          businessAccountId: json.data.whatsappBusinessAccountId || "",
          isApiConfigured: Boolean(json.data.isWhatsAppApiConfigured),
          notifications: {
            ...prev.notifications,
            ...(json.data.whatsappNotificationsEnabled || {}),
          },
          templateMapping: {
            ...prev.templateMapping,
            ...(json.data.whatsappTemplateMapping || {}),
          },
        }));
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveWhatsappSettings = async () => {
    setSavingWhatsapp(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappEnabled: whatsappSettings.enabled,
          whatsappPhoneNumberId: whatsappSettings.phoneNumberId,
          whatsappBusinessAccountId: whatsappSettings.businessAccountId,
          whatsappNotificationsEnabled: whatsappSettings.notifications,
          whatsappTemplateMapping: whatsappSettings.templateMapping,
        }),
      });
      if (res.ok) {
        alert("WhatsApp automation settings saved successfully!");
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error?.message || "Failed to save WhatsApp settings.");
      }
    } catch (err) {
      console.error("Failed to save WhatsApp settings:", err);
      alert("Network error saving WhatsApp settings.");
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const fetchCommission = async () => {
    try {
      const res = await fetch("/api/admin/payments/commission");
      const json = await res.json();
      if (json.data?.percentage !== undefined) setCommissionRate(json.data.percentage);
    } catch (err) {
      console.error("Failed to load commission:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/settings/categories");
      const json = await res.json();
      if (json.data?.categories) setCategories(json.data.categories);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const saveGeneralSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_name: generalSettings.siteName,
          support_email: generalSettings.supportEmail,
          allow_registration: generalSettings.allowRegistration,
          require_teacher_approval: generalSettings.requireTeacherApproval,
          maintenance_mode: generalSettings.maintenanceMode,
        }),
      });
      if (res.ok) alert("General settings saved successfully!");
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const saveCompanySettings = async () => {
    setSavingCompany(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_brand_name: companySettings.brandName,
          company_legal_name: companySettings.legalName,
          company_cin: companySettings.cin,
          company_pan: companySettings.pan,
          company_founder: companySettings.founder,
          company_authorized_signatory: companySettings.authorizedSignatory,
          company_registered_address: companySettings.registeredAddress,
          company_website: companySettings.website,
          company_tagline: companySettings.tagline,
          company_governing_law: companySettings.governingLaw,
          company_whatsapp_number: companySettings.whatsappNumber,
          company_refund_period: companySettings.refundPeriod,
          company_pricing_range: companySettings.pricingRange,
        }),
      });
      if (res.ok) alert("Official company information updated successfully!");
    } catch (err) {
      console.error("Failed to save company settings:", err);
    } finally {
      setSavingCompany(false);
    }
  };

  const saveSocialSettings = async () => {
    setSocialError("");
    const urlPattern = /^https?:\/\/.+/i;

    let currentWhatsapp = (socialSettings.whatsappUrl || "").trim();
    if (currentWhatsapp && !urlPattern.test(currentWhatsapp)) {
      if (/^[0-9+\s\-()]+$/.test(currentWhatsapp)) {
        currentWhatsapp = `https://wa.me/${currentWhatsapp.replace(/[^0-9]/g, "")}`;
      } else if (currentWhatsapp.startsWith("wa.me/")) {
        currentWhatsapp = `https://${currentWhatsapp}`;
      }
    }

    const payloadToValidate: Record<string, string | undefined> = {
      ...socialSettings,
      whatsappUrl: currentWhatsapp,
    };

    for (const [platform, url] of Object.entries(payloadToValidate)) {
      const val = typeof url === "string" ? url.trim() : "";
      if (val !== "" && !urlPattern.test(val)) {
        setSocialError(`Please enter a valid URL starting with http:// or https:// for ${platform}.`);
        return;
      }
    }

    setSavingSocial(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          social_youtube_url: (socialSettings.youtubeUrl || "").trim(),
          social_facebook_url: (socialSettings.facebookUrl || "").trim(),
          social_instagram_url: (socialSettings.instagramUrl || "").trim(),
          social_linkedin_url: (socialSettings.linkedinUrl || "").trim(),
          social_whatsapp_url: currentWhatsapp,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (currentWhatsapp !== socialSettings.whatsappUrl) {
          setSocialSettings((prev) => ({ ...prev, whatsappUrl: currentWhatsapp }));
        }
        alert("Social media settings updated successfully!");
      } else {
        setSocialError(data?.error?.message || "Failed to update social media links.");
      }
    } catch (err: any) {
      console.error("Failed to save social settings:", err);
      setSocialError(err?.message || "An unexpected error occurred.");
    } finally {
      setSavingSocial(false);
    }
  };

  const saveCommission = async () => {
    setSavingCommission(true);
    try {
      const res = await fetch("/api/admin/payments/commission", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percentage: commissionRate }),
      });
      if (res.ok) alert("Platform commission updated successfully!");
    } catch (err) {
      console.error("Failed to save commission:", err);
    } finally {
      setSavingCommission(false);
    }
  };

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const res = await fetch("/api/admin/settings/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName, description: newCatDesc }),
      });
      const json = await res.json();
      if (res.ok) {
        setNewCatName("");
        setNewCatDesc("");
        fetchCategories();
      } else {
        alert(json.error?.message || "Failed to create category.");
      }
    } catch (err) {
      console.error("Error creating category:", err);
    } finally {
      setCreatingCat(false);
    }
  };

  const toggleCategoryActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/admin/settings/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      if (res.ok) fetchCategories();
    } catch (err) {
      console.error("Failed to toggle category active:", err);
    }
  };

  return (
    <DashboardLayout role="ADMIN" userName="System Administrator" userEmail="educonnects.com@gmail.com">
      <div className="space-y-6 pb-16 font-sans">
        <div>
          <BackButton
            fallbackUrl="/admin"
            label="Back to Dashboard"
            variant="default"
            className="mb-3"
          />
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Platform Settings & Company Profile
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Centralized company identity, platform parameters, revenue commission rates, and course categories.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === "general"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Settings className="h-4 w-4" />
            General Settings
          </button>

          <button
            onClick={() => setActiveTab("company")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === "company"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Company Profile
          </button>

          <button
            onClick={() => setActiveTab("social")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === "social"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Share2 className="h-4 w-4" />
            Social Media Links
          </button>

          <button
            onClick={() => setActiveTab("commission")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === "commission"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Percent className="h-4 w-4" />
            Commission Settings
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === "categories"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            Course Categories
          </button>

          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeTab === "whatsapp"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp Automation
          </button>
        </div>

        {/* Tab 1: General Settings */}
        {activeTab === "general" && (
          <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-6 max-w-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
              General Configuration
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Platform Name</label>
                <input
                  type="text"
                  value={generalSettings.siteName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Support Email</label>
                <input
                  type="email"
                  value={generalSettings.supportEmail}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generalSettings.allowRegistration}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, allowRegistration: e.target.checked })}
                    className="w-4 h-4 rounded-md text-blue-600"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">Allow Public User Registrations</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generalSettings.requireTeacherApproval}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, requireTeacherApproval: e.target.checked })}
                    className="w-4 h-4 rounded-md text-blue-600"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">Require Admin Approval for Teacher Verification</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generalSettings.maintenanceMode}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, maintenanceMode: e.target.checked })}
                    className="w-4 h-4 rounded-md text-blue-600"
                  />
                  <span className="font-bold text-red-600">Enable Maintenance Mode (Restricts Student access)</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <GlassButton
                variant="primary"
                size="sm"
                disabled={savingSettings}
                onClick={saveGeneralSettings}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save General Settings
              </GlassButton>
            </div>
          </Card>
        )}

        {/* Tab 2: Company Profile Settings */}
        {activeTab === "company" && (
          <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-6 max-w-3xl">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Official Company Profile Parameters</h3>
              <p className="text-xs text-slate-500">
                Manage business details displayed across footers, contact forms, pricing pages, and legal policies.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Brand Name</label>
                <input
                  type="text"
                  value={companySettings.brandName}
                  onChange={(e) => setCompanySettings({ ...companySettings, brandName: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Legal Company Name</label>
                <input
                  type="text"
                  value={companySettings.legalName}
                  onChange={(e) => setCompanySettings({ ...companySettings, legalName: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">CIN (Corporate Identification No.)</label>
                <input
                  type="text"
                  value={companySettings.cin}
                  onChange={(e) => setCompanySettings({ ...companySettings, cin: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-mono font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">PAN</label>
                <input
                  type="text"
                  value={companySettings.pan}
                  onChange={(e) => setCompanySettings({ ...companySettings, pan: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-mono font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Founder</label>
                <input
                  type="text"
                  value={companySettings.founder}
                  onChange={(e) => setCompanySettings({ ...companySettings, founder: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Authorized Signatory</label>
                <input
                  type="text"
                  value={companySettings.authorizedSignatory}
                  onChange={(e) => setCompanySettings({ ...companySettings, authorizedSignatory: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Official WhatsApp Number</label>
                <input
                  type="text"
                  value={companySettings.whatsappNumber}
                  onChange={(e) => setCompanySettings({ ...companySettings, whatsappNumber: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Official Website URL</label>
                <input
                  type="text"
                  value={companySettings.website}
                  onChange={(e) => setCompanySettings({ ...companySettings, website: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tagline</label>
                <input
                  type="text"
                  value={companySettings.tagline}
                  onChange={(e) => setCompanySettings({ ...companySettings, tagline: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Pricing Range Display</label>
                <input
                  type="text"
                  value={companySettings.pricingRange}
                  onChange={(e) => setCompanySettings({ ...companySettings, pricingRange: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Registered Address</label>
                <input
                  type="text"
                  value={companySettings.registeredAddress}
                  onChange={(e) => setCompanySettings({ ...companySettings, registeredAddress: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Refund Policy Period Note</label>
                <input
                  type="text"
                  value={companySettings.refundPeriod}
                  onChange={(e) => setCompanySettings({ ...companySettings, refundPeriod: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <GlassButton
                variant="primary"
                size="sm"
                disabled={savingCompany}
                onClick={saveCompanySettings}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Company Profile
              </GlassButton>
            </div>
          </Card>
        )}

        {/* Tab: Social Media Links */}
        {activeTab === "social" && (
          <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-6 max-w-3xl">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Social Media URLs</h3>
              <p className="text-xs text-slate-500">
                Configure official social media profile URLs. Empty fields will be automatically hidden from the public website footer.
              </p>
            </div>

            {socialError && (
              <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl font-bold">
                {socialError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">YouTube URL</label>
                <input
                  type="url"
                  placeholder="https://youtube.com/@educonnects"
                  value={socialSettings.youtubeUrl}
                  onChange={(e) => setSocialSettings({ ...socialSettings, youtubeUrl: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Facebook URL</label>
                <input
                  type="url"
                  placeholder="https://facebook.com/educonnects"
                  value={socialSettings.facebookUrl}
                  onChange={(e) => setSocialSettings({ ...socialSettings, facebookUrl: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Instagram URL</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/educonnects"
                  value={socialSettings.instagramUrl}
                  onChange={(e) => setSocialSettings({ ...socialSettings, instagramUrl: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">WhatsApp URL / Link</label>
                <input
                  type="url"
                  placeholder="https://wa.me/919109019090 or https://chat.whatsapp.com/..."
                  value={socialSettings.whatsappUrl}
                  onChange={(e) => setSocialSettings({ ...socialSettings, whatsappUrl: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/company/educonnects"
                  value={socialSettings.linkedinUrl}
                  onChange={(e) => setSocialSettings({ ...socialSettings, linkedinUrl: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <GlassButton
                variant="primary"
                size="sm"
                disabled={savingSocial}
                onClick={saveSocialSettings}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Social Media Links
              </GlassButton>
            </div>
          </Card>
        )}

        {/* Tab 3: Commission Settings */}
        {activeTab === "commission" && (
          <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-6 max-w-2xl">
            <div className="space-y-1 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Platform Revenue Commission</h3>
              <p className="text-xs text-slate-500">
                Configure default percentage retained by EduConnects on course enrollments and live class bookings. Existing transactions maintain historical snapshot.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Platform Commission Rate (%)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-32 h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-bold text-base outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-extrabold text-slate-600 dark:text-slate-400">%</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-blue-900 dark:text-blue-300 space-y-1">
                <span className="font-extrabold block">Commission Split Example:</span>
                <p>On a ₹1,000 booking with {commissionRate}% commission:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Platform Earns: ₹{(1000 * (commissionRate / 100)).toFixed(2)}</li>
                  <li>Educator Receives: ₹{(1000 * (1 - commissionRate / 100)).toFixed(2)}</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <GlassButton
                variant="primary"
                size="sm"
                disabled={savingCommission}
                onClick={saveCommission}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Update Commission Settings
              </GlassButton>
            </div>
          </Card>
        )}

        {/* Tab 4: Course Categories */}
        {activeTab === "categories" && (
          <div className="space-y-6 max-w-4xl">
            {/* Create Category Card */}
            <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-md font-black text-slate-900 dark:text-slate-100">Create New Course Category</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category Name</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Data Science & AI"
                    className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Brief overview of category focus..."
                    className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <GlassButton
                variant="primary"
                size="sm"
                disabled={creatingCat || !newCatName.trim()}
                onClick={createCategory}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Create Category
              </GlassButton>
            </Card>

            {/* Categories Table */}
            <Card className="p-0 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Category Name</th>
                    <th className="p-4">Slug</th>
                    <th className="p-4">Courses Associated</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Toggle Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500 font-bold">
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-extrabold text-slate-900 dark:text-slate-100">{cat.name}</td>
                        <td className="p-4 text-slate-500 font-mono">{cat.slug}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{cat.courseCount} Courses</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              cat.isActive
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {cat.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <GlassButton
                            variant="secondary"
                            className={!cat.isActive ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" : ""}
                            size="sm"
                            onClick={() => toggleCategoryActive(cat.id, !cat.isActive)}
                          >
                            {cat.isActive ? "Deactivate" : "Activate"}
                          </GlassButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* Tab 6: WhatsApp Automation */}
        {activeTab === "whatsapp" && (
          <div className="space-y-6 max-w-4xl">
            {/* Meta Cloud API Status Banner */}
            <Card className="p-6 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      Meta WhatsApp Cloud API Integration
                      {whatsappSettings.isApiConfigured ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> CONNECTED (v20.0)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> TOKEN REQUIRED IN ENV
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Server-side transactional notification engine utilizing Meta WhatsApp Cloud API.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href="/admin/whatsapp"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View Message Logs
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                </div>
              </div>

              {/* Master Global Toggle & Credentials */}
              <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block">
                      Global WhatsApp Automation
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Master toggle for all outbound event messages
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={whatsappSettings.enabled}
                    onChange={(e) =>
                      setWhatsappSettings({
                        ...whatsappSettings,
                        enabled: e.target.checked,
                      })
                    }
                    className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </div>

                <div className="p-4 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">
                    Meta Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={whatsappSettings.phoneNumberId}
                    onChange={(e) =>
                      setWhatsappSettings({
                        ...whatsappSettings,
                        phoneNumberId: e.target.value,
                      })
                    }
                    placeholder="e.g. 109283746592019"
                    className="w-full h-8 px-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg font-mono text-[11px] outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </Card>

            {/* Individual Notification Event Toggles */}
            <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Automatic Notification Triggers
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select which platform actions automatically trigger WhatsApp notifications.
                </p>
              </div>

              {/* Group 1: Payments & Financial Events */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Payment & Financial Lifecycle
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { key: "PAYMENT_SUCCESS", label: "Payment Success", desc: "Sent upon payment confirmation" },
                    { key: "PAYMENT_FAILED", label: "Payment Failed", desc: "Sent when transaction fails with retry link" },
                    { key: "PAYMENT_RECEIPT", label: "Receipt Generated", desc: "Includes official secure receipt link" },
                    { key: "REFUND_REQUESTED", label: "Refund Request Received", desc: "Informs user request is under review" },
                    { key: "REFUND_APPROVED", label: "Refund Approved", desc: "Notifies user refund is authorized" },
                    { key: "REFUND_COMPLETED", label: "Refund Completed", desc: "Triggered only after gateway confirms" },
                    { key: "REFUND_REJECTED", label: "Refund Rejected", desc: "Includes explanation for rejection" },
                  ].map(({ key, label, desc }) => (
                    <label
                      key={key}
                      className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean((whatsappSettings.notifications as any)[key])}
                        onChange={(e) =>
                          setWhatsappSettings({
                            ...whatsappSettings,
                            notifications: {
                              ...whatsappSettings.notifications,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{label}</span>
                        <span className="text-[11px] text-slate-500">{desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Group 2: Registration & Verification */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  User Registration & Verification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { key: "LEARNER_REGISTRATION", label: "Learner Registration", desc: "Welcome confirmation upon verified signup" },
                    { key: "EDUCATOR_REGISTRATION", label: "Educator Registration", desc: "Onboarding guide after educator signup" },
                    { key: "EDUCATOR_VERIFIED", label: "Educator Verification Approved", desc: "Confirmation when Admin verifies educator" },
                    { key: "EDUCATOR_VERIFICATION_PENDING", label: "Educator Verification Pending", desc: "Explains documents are under review" },
                    { key: "EDUCATOR_REJECTED", label: "Educator Application Revision", desc: "Notifies educator of needed changes" },
                  ].map(({ key, label, desc }) => (
                    <label
                      key={key}
                      className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean((whatsappSettings.notifications as any)[key])}
                        onChange={(e) =>
                          setWhatsappSettings({
                            ...whatsappSettings,
                            notifications: {
                              ...whatsappSettings.notifications,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{label}</span>
                        <span className="text-[11px] text-slate-500">{desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Group 3: Course & Live Classes */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Courses & Live Learning Sessions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { key: "COURSE_ENROLLED", label: "Course Enrollment", desc: "Confirmation with learning dashboard link" },
                    { key: "BOOKING_CONFIRMED", label: "Booking Confirmation", desc: "Live class slot reservation confirmed" },
                    { key: "CLASS_REMINDER", label: "Class Starting Reminder", desc: "Automated alert at 24h, 1h, and 10m windows" },
                    { key: "CLASS_CANCELLED", label: "Class Cancellation", desc: "Alerts students when session is cancelled" },
                  ].map(({ key, label, desc }) => (
                    <label
                      key={key}
                      className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean((whatsappSettings.notifications as any)[key])}
                        onChange={(e) =>
                          setWhatsappSettings({
                            ...whatsappSettings,
                            notifications: {
                              ...whatsappSettings.notifications,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{label}</span>
                        <span className="text-[11px] text-slate-500">{desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            {/* Meta Template Mapping Table */}
            <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Approved Meta WhatsApp Template Mapping
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure custom template names if you registered alternate template identifiers in Meta Business Suite.
                </p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3">Platform Event</th>
                      <th className="p-3">Default Approved Template</th>
                      <th className="p-3">Active Meta Template Name Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { event: "PAYMENT_SUCCESS", defaultName: "edu_payment_success" },
                      { event: "PAYMENT_RECEIPT", defaultName: "edu_payment_receipt" },
                      { event: "PAYMENT_FAILED", defaultName: "edu_stu_payment_failed" },
                      { event: "PAYMENT_FAILED_TEACHER", defaultName: "edu_teacher_payment_failed" },
                      { event: "REFUND_REQUESTED", defaultName: "edu_refund_requested" },
                      { event: "REFUND_APPROVED", defaultName: "edu_refund_approved" },
                      { event: "REFUND_COMPLETED", defaultName: "edu_refund_completed" },
                      { event: "REFUND_REJECTED", defaultName: "edu_refund_rejected" },
                      { event: "LEARNER_REGISTRATION", defaultName: "edu_learner_welcome" },
                      { event: "EDUCATOR_REGISTRATION", defaultName: "edu_teacher_welcome" },
                      { event: "EDUCATOR_VERIFIED", defaultName: "edu_teacher_verified" },
                      { event: "EDUCATOR_VERIFICATION_PENDING", defaultName: "edu_teacher_pending" },
                      { event: "EDUCATOR_REJECTED", defaultName: "edu_teacher_rejected" },
                      { event: "COURSE_ENROLLED", defaultName: "edu_course_enrolled" },
                      { event: "BOOKING_CONFIRMED", defaultName: "edu_booking_confirmed" },
                      { event: "CLASS_REMINDER", defaultName: "edu_class_reminder" },
                      { event: "CLASS_CANCELLED", defaultName: "edu_class_cancelled" },
                    ].map(({ event, defaultName }) => (
                      <tr key={event} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200">
                          {event}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {defaultName}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={(whatsappSettings.templateMapping as any)[event] || defaultName}
                            onChange={(e) =>
                              setWhatsappSettings({
                                ...whatsappSettings,
                                templateMapping: {
                                  ...whatsappSettings.templateMapping,
                                  [event]: e.target.value.trim(),
                                },
                              })
                            }
                            placeholder={defaultName}
                            className="w-full h-8 px-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg font-mono text-[11px] outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex justify-end">
                <GlassButton
                  onClick={saveWhatsappSettings}
                  disabled={savingWhatsapp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                >
                  {savingWhatsapp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save WhatsApp Automation Settings
                </GlassButton>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
