"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Upload,
  PlayCircle,
  FileText,
  Paperclip,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Save,
  Eye,
  Check,
  X,
  Layers,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Lock,
  ShieldAlert,
  Award,
  Users,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BackButton } from "@/components/ui/back-button";

export default function TeacherCourseEditorPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [savingStatus, setSavingStatus] = useState<"IDLE" | "SAVING" | "SAVED">("IDLE");
  const [errorMsg, setErrorMsg] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string>("PENDING");

  // Step 1 Form state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const PRESET_SUBJECTS = ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "Computer Science", "English"];
  const [subject, setSubject] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [category, setCategory] = useState("General");
  const [level, setLevel] = useState("BEGINNER");
  const [price, setPrice] = useState("0");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // Step 3 Outcomes, Reqs, Settings state
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [newOutcome, setNewOutcome] = useState("");
  const [reqs, setReqs] = useState<string[]>([]);
  const [newReq, setNewReq] = useState("");
  const [certificateEnabled, setCertificateEnabled] = useState(true);
  const [maxEnrollment, setMaxEnrollment] = useState("0");

  // Modals state for Curriculum
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState("VIDEO");
  const [lessonIsPreview, setLessonIsPreview] = useState(false);
  const [lessonContent, setLessonContent] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadedVideoAssetId, setUploadedVideoAssetId] = useState("");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(300);
  const [userName, setUserName] = useState("Educator");
  const [userEmail, setUserEmail] = useState("");
  const [lessonProgresses, setLessonProgresses] = useState<{ [key: string]: number }>({});

  const fetchEditorDataSilent = async () => {
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`);
      const data = await res.json();
      if (data.success && data.data.course) {
        setCourse(data.data.course);
      }
    } catch (err) {
      console.error("Silent editor poll failed:", err);
    }
  };

  const fetchEditorData = async () => {
    setLoading(true);
    try {
      const profileRes = await fetch("/api/teacher/onboarding");
      const profileJson = await profileRes.json();
      if (profileJson.data) {
        setUserName(`${profileJson.data.profile.firstName} ${profileJson.data.profile.lastName}`.trim() || profileJson.data.user.email);
        setUserEmail(profileJson.data.user.email);
        if (profileJson.data.teacherProfile) {
          setVerificationStatus(profileJson.data.teacherProfile.verificationStatus || "PENDING");
        }
      }

      const res = await fetch(`/api/teacher/courses/${courseId}`);
      const data = await res.json();
      if (data.success && data.data.course) {
        const c = data.data.course;
        setCourse(c);
        setTitle(c.title || "");
        setSubtitle(c.subtitle || "");
        setDescription(c.description || "");
        const fetchedSub = c.subject || "Mathematics";
        setSubject(fetchedSub);
        if (fetchedSub && !PRESET_SUBJECTS.includes(fetchedSub)) {
          setIsCustomSubject(true);
        }
        setCategory(c.category || "General");
        setLevel(c.level || "BEGINNER");
        setPrice(c.price !== undefined ? c.price.toString() : "0");
        setThumbnailUrl(c.thumbnailUrl || "");
        setOutcomes(c.learningOutcomes || []);
        setReqs(c.requirements || []);
      }
    } catch (err) {
      console.error("Failed to fetch editor data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) fetchEditorData();
  }, [courseId]);

  useEffect(() => {
    let interval: any = null;
    const hasProcessing = course?.sections?.some((s: any) =>
      s.lessons?.some((l: any) => l.status === "UPLOADING" || l.status === "PROCESSING")
    );

    if (hasProcessing && courseId) {
      interval = setInterval(() => {
        fetchEditorDataSilent();
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [course, courseId]);

  const handleSaveBasicInfo = async (overrideThumbnailUrl?: string | React.MouseEvent) => {
    setSavingStatus("SAVING");
    setErrorMsg("");
    const activeThumbnailUrl = typeof overrideThumbnailUrl === "string" ? overrideThumbnailUrl : thumbnailUrl;
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle,
          description,
          subject,
          category,
          level,
          price: Number(price) || 0,
          thumbnailUrl: activeThumbnailUrl,
          learningOutcomes: outcomes,
          requirements: reqs,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavingStatus("SAVED");
        fetchEditorData();
        setTimeout(() => setSavingStatus("IDLE"), 2000);
        return true;
      } else {
        setErrorMsg(data.error || "Failed to save course info.");
        setSavingStatus("IDLE");
        return false;
      }
    } catch (err) {
      console.error("Failed to save course info:", err);
      setSavingStatus("IDLE");
      return false;
    }
  };

  const validateStep1 = () => {
    if (!title.trim() || title.trim().length < 4) {
      setErrorMsg("Course Title must be at least 4 characters.");
      return false;
    }
    if (!description.trim() || description.trim().length < 11) {
      setErrorMsg("Course Description must be at least 11 characters.");
      return false;
    }
    if (!subject.trim()) {
      setErrorMsg("Please select or enter a teaching Subject.");
      return false;
    }
    setErrorMsg("");
    return true;
  };

  const validateStep2 = () => {
    const sectionsCount = course?.sections?.length || 0;
    if (sectionsCount === 0) {
      setErrorMsg("Please add at least 1 curriculum section in Step 2.");
      return false;
    }
    const totalLessons = course?.sections?.reduce((acc: number, s: any) => acc + (s.lessons?.length || 0), 0) || 0;
    if (totalLessons === 0) {
      setErrorMsg("Please add at least 1 lesson with content in your curriculum.");
      return false;
    }
    setErrorMsg("");
    return true;
  };

  const handleNextFromStep1 = async () => {
    if (!validateStep1()) return;
    await handleSaveBasicInfo();
    setActiveStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextFromStep2 = async () => {
    if (!validateStep2()) return;
    setActiveStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextFromStep3 = async () => {
    await handleSaveBasicInfo();
    setActiveStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumb(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/teacher/upload-thumbnail", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data.thumbnailUrl) {
        const newThumb = data.data.thumbnailUrl;
        setThumbnailUrl(newThumb);
        await handleSaveBasicInfo(newThumb);
      } else {
        setErrorMsg(data.error || "Failed to upload thumbnail.");
      }
    } catch (err) {
      console.error("Failed to upload thumbnail:", err);
      setErrorMsg("Thumbnail upload failed.");
    } finally {
      setUploadingThumb(false);
    }
  };

  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState<"IDLE" | "UPLOADING" | "UPLOADED" | "PROCESSING" | "READY" | "FAILED">("IDLE");
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingVideoFile(file);
    setVideoStatus("UPLOADED");
  };

  const handleDirectLessonVideoUpload = async (lessonId: string, file: File) => {
    try {
      setUploadingVideo(true);
      setVideoStatus("UPLOADING");
      setErrorMsg("");

      const urlRes = await fetch("/api/teacher/videos/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonId }),
      });

      const urlData = await urlRes.json();
      if (!urlData.success || !urlData.data?.uploadUrl) {
        throw new Error(urlData.error || "Failed to create Mux upload URL.");
      }

      if (urlData.data.uploadUrl.startsWith("/api/teacher/upload-video")) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("lessonId", lessonId);
        const localRes = await fetch("/api/teacher/upload-video", {
          method: "POST",
          body: formData,
        });
        const localData = await localRes.json();
        if (!localRes.ok || !localData.success) {
          throw new Error(localData.error || "Local video upload failed.");
        }
      } else {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", urlData.data.uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setLessonProgresses((prev) => ({
                ...prev,
                [lessonId]: percentComplete,
              }));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Direct Mux upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network error during video upload."));
          xhr.send(file);
        });
      }

      setVideoStatus("PROCESSING");
      fetchEditorData();
    } catch (err: any) {
      console.error("Direct lesson video upload failed:", err);
      setErrorMsg(err.message || "Video upload failed.");
      setVideoStatus("FAILED");
    } finally {
      setUploadingVideo(false);
      setLessonProgresses((prev) => {
        const copy = { ...prev };
        delete copy[lessonId];
        return copy;
      });
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim()) return;
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: sectionTitle }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSectionModal(false);
        setSectionTitle("");
        fetchEditorData();
      } else {
        setErrorMsg(data.error || "Failed to add section.");
      }
    } catch (err) {
      console.error("Failed to add section:", err);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/sections/${sectionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) fetchEditorData();
    } catch (err) {
      console.error("Failed to delete section:", err);
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim() || !selectedSectionId) return;
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/sections/${selectedSectionId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lessonTitle,
          type: lessonType,
          isPreview: lessonIsPreview,
          content: lessonContent,
          duration: videoDurationSeconds,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.lesson) {
        const newLessonId = data.data.lesson.id;
        setShowLessonModal(false);
        setLessonTitle("");
        setLessonContent("");
        setLessonIsPreview(false);

        if (pendingVideoFile) {
          await handleDirectLessonVideoUpload(newLessonId, pendingVideoFile);
          setPendingVideoFile(null);
        } else {
          fetchEditorData();
        }
      } else {
        setErrorMsg(data.error || "Failed to create lesson.");
      }
    } catch (err) {
      console.error("Failed to add lesson:", err);
    }
  };

  const handleDeleteLesson = async (sectionId: string, lessonId: string) => {
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) fetchEditorData();
    } catch (err) {
      console.error("Failed to delete lesson:", err);
    }
  };

  const handlePublish = async () => {
    if (verificationStatus !== "VERIFIED") {
      setErrorMsg("Educator verification required to publish courses. Please complete educator KYC first.");
      router.push("/teacher/onboarding");
      return;
    }

    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchEditorData();
      } else {
        setErrorMsg(data.error || "Failed to publish course.");
      }
    } catch (err: any) {
      setErrorMsg("Publish request failed.");
    }
  };

  const handleUnpublish = async () => {
    try {
      await fetch(`/api/teacher/courses/${courseId}/unpublish`, { method: "POST" });
      fetchEditorData();
    } catch (err) {
      console.error("Failed to unpublish:", err);
    }
  };

  if (loading || !course) {
    return (
      <DashboardLayout role="TEACHER" userName={userName} userEmail={userEmail}>
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  const totalSections = course.sections?.length || 0;
  const totalLessons = course.sections?.reduce((acc: number, s: any) => acc + (s.lessons?.length || 0), 0) || 0;

  return (
    <DashboardLayout role="TEACHER" userName={userName} userEmail={userEmail}>
      <div className="space-y-8">
        {/* Verification Warning Alert if educator is not verified */}
        {verificationStatus !== "VERIFIED" && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong>Verification Required:</strong> You can build and preview this course, but educator verification must be approved before you can publish.
              </span>
            </div>
            <Link
              href="/teacher/onboarding"
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs shrink-0 hover:bg-amber-400"
            >
              Complete Verification
            </Link>
          </div>
        )}

        {/* Top Header & Quick Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BackButton
                fallbackUrl="/teacher/courses"
                label="Back to Courses"
                variant="dark"
                size="sm"
              />
              <span
                className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                  course.status === "PUBLISHED"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}
              >
                {course.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 mt-1">{course.title}</h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {savingStatus === "SAVING" && (
              <span className="text-xs text-amber-400 font-semibold animate-pulse">Saving...</span>
            )}
            {savingStatus === "SAVED" && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved ✓
              </span>
            )}

            <button
              onClick={handleSaveBasicInfo}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
            >
              <Save className="w-3.5 h-3.5" /> Save Progress
            </button>

            <Link
              href={`/courses/${course?.slug || courseId}/preview`}
              target="_blank"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition"
            >
              <Eye className="w-3.5 h-3.5" /> Student Preview
            </Link>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-rose-400 hover:text-rose-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4-Step Builder Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
          {[
            { step: 1, label: "Step 1: Course Info", icon: BookOpen },
            { step: 2, label: "Step 2: Curriculum Builder", icon: Layers },
            { step: 3, label: "Step 3: Settings & Pricing", icon: Award },
            { step: 4, label: "Step 4: Review & Publish", icon: CheckCircle2 },
          ].map((s) => (
            <button
              key={s.step}
              onClick={() => {
                setErrorMsg("");
                setActiveStep(s.step);
              }}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                activeStep === s.step
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <s.icon className="w-4 h-4" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: COURSE INFO */}
        {/* ========================================================================= */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6 p-6 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold text-slate-100">Step 1: Course Basic Information</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Title, subject category, description, and difficulty level</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Course Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Complete Calculus & Vectors for Grade 12"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Subtitle / Tagline</label>
                    <input
                      type="text"
                      placeholder="e.g. Master conceptual calculus from fundamentals to competitive examination problems"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Description *</label>
                    <textarea
                      rows={5}
                      placeholder="Provide an in-depth summary of what students will achieve in this course (minimum 11 characters)..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-300">Subject *</label>
                        <button
                          type="button"
                          onClick={() => {
                            const nextState = !isCustomSubject;
                            setIsCustomSubject(nextState);
                            if (!nextState && !PRESET_SUBJECTS.includes(subject)) {
                              setSubject("Mathematics");
                            }
                          }}
                          className="text-[10px] text-blue-400 hover:underline font-semibold"
                        >
                          {isCustomSubject ? "← Choose from list" : "+ Custom Subject"}
                        </button>
                      </div>

                      {isCustomSubject ? (
                        <input
                          type="text"
                          placeholder="e.g. Instagram Growth, Python..."
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none focus:border-blue-500"
                        />
                      ) : (
                        <select
                          value={PRESET_SUBJECTS.includes(subject) ? subject : "OTHER"}
                          onChange={(e) => {
                            if (e.target.value === "OTHER") {
                              setIsCustomSubject(true);
                              setSubject("");
                            } else {
                              setSubject(e.target.value);
                            }
                          }}
                          className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none focus:border-blue-500"
                        >
                          {PRESET_SUBJECTS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                          <option value="OTHER">+ Add Custom Subject / Other...</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Difficulty Level *</label>
                      <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none"
                      >
                        <option value="BEGINNER">Beginner (Foundational)</option>
                        <option value="INTERMEDIATE">Intermediate (Core Concepts)</option>
                        <option value="ADVANCED">Advanced (Mastery & Exam prep)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thumbnail Upload Sidebar */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-slate-100">Course Thumbnail</h3>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4 text-slate-500 text-xs">No thumbnail uploaded</div>
                  )}
                </div>

                <label className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 text-center block cursor-pointer hover:bg-blue-600/30 transition">
                  {uploadingThumb ? "Uploading Thumbnail..." : "Upload Cover Image"}
                  <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                </label>
                <p className="text-[10px] text-slate-500 text-center">Recommended ratio: 16:9 (PNG, JPG &le; 5MB)</p>
              </div>
            </div>

            {/* Step 1 Navigation Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Step 1 of 4: Course Basic Information</span>
              <button
                onClick={handleNextFromStep1}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-md shadow-blue-500/20"
              >
                <span>Next: Curriculum Builder</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: CURRICULUM BUILDER */}
        {/* ========================================================================= */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Step 2: Curriculum Builder</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Organize your course into curriculum sections and upload lesson videos or notes
                </p>
              </div>
              <button
                onClick={() => setShowSectionModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-500 transition"
              >
                <Plus className="w-4 h-4" /> Add Section
              </button>
            </div>

            {course.sections?.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs space-y-3">
                <Layers className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="font-bold text-slate-300">No curriculum sections created yet.</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Click "+ Add Section" to create your first module, then add video lessons.
                </p>
                <button
                  onClick={() => setShowSectionModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Section Now
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {course.sections.map((sec: any, secIdx: number) => (
                  <div key={sec.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <span className="font-bold text-sm text-slate-200 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                          {secIdx + 1}
                        </span>
                        <span>Section: {sec.title}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSectionId(sec.id);
                            setShowLessonModal(true);
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition"
                        >
                          + Add Lesson
                        </button>
                        <button onClick={() => handleDeleteSection(sec.id)} className="text-slate-500 hover:text-red-400 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {sec.lessons?.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 italic bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                          No lessons in this section. Click "+ Add Lesson" to add videos or text.
                        </div>
                      ) : (
                        sec.lessons?.map((les: any, lesIdx: number) => (
                          <div
                            key={les.id}
                            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500 font-mono text-[11px]">{lesIdx + 1}.</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-200">{les.title}</span>
                                  {les.isPreview && (
                                    <span className="px-2 py-0.2 text-[9px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-400">
                                      Free Preview
                                    </span>
                                  )}
                                  <span className="px-2 py-0.2 text-[9px] font-bold uppercase rounded bg-slate-800 text-slate-400">
                                    {les.type}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {les.videoAssetId ? "Mux Video Attached" : les.videoUrl ? "Video Attached" : "No video attached"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center">
                              {lessonProgresses[les.id] !== undefined ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="bg-blue-500 h-full transition-all"
                                      style={{ width: `${lessonProgresses[les.id]}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-blue-400">{lessonProgresses[les.id]}%</span>
                                </div>
                              ) : (
                                <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1.5">
                                  <Upload className="w-3 h-3 text-blue-400" />
                                  <span>{les.videoAssetId || les.videoUrl ? "Replace Video" : "Upload Video"}</span>
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleDirectLessonVideoUpload(les.id, file);
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              )}

                              <button
                                onClick={() => handleDeleteLesson(sec.id, les.id)}
                                className="text-slate-500 hover:text-red-400 p-1"
                                title="Delete Lesson"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2 Navigation Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setActiveStep(1)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back: Course Info</span>
              </button>

              <button
                onClick={handleNextFromStep2}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-md shadow-blue-500/20"
              >
                <span>Next: Settings & Pricing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: COURSE SETTINGS & PRICING */}
        {/* ========================================================================= */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pricing & Access Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" /> Course Pricing & Enrollment
                </h3>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Course Price (₹ INR) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for free"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none focus:border-blue-500 font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Set ₹0 to offer this course freely to all learners, or enter your full course price.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">Maximum Learner Seats (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for unlimited"
                    value={maxEnrollment}
                    onChange={(e) => setMaxEnrollment(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Leave 0 for unlimited enrollments.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-200">Certificate of Completion</div>
                    <div className="text-[11px] text-slate-500">Auto-issue verified EduConnect certificate upon 100% completion</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={certificateEnabled}
                    onChange={(e) => setCertificateEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </div>
              </div>

              {/* Learning Outcomes & Requirements */}
              <div className="space-y-6">
                {/* Outcomes */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" /> Learning Outcomes
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Master quadratic equations"
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      className="flex-1 px-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none"
                    />
                    <button
                      onClick={() => {
                        if (newOutcome.trim()) {
                          setOutcomes([...outcomes, newOutcome.trim()]);
                          setNewOutcome("");
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {outcomes.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                        <span>✓ {item}</span>
                        <button onClick={() => setOutcomes(outcomes.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h3 className="text-base font-bold text-slate-100">Prerequisites & Requirements</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Basic secondary school algebra"
                      value={newReq}
                      onChange={(e) => setNewReq(e.target.value)}
                      className="flex-1 px-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none"
                    />
                    <button
                      onClick={() => {
                        if (newReq.trim()) {
                          setReqs([...reqs, newReq.trim()]);
                          setNewReq("");
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {reqs.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                        <span>• {item}</span>
                        <button onClick={() => setReqs(reqs.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 Navigation Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setActiveStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back: Curriculum Builder</span>
              </button>

              <button
                onClick={handleNextFromStep3}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-md shadow-blue-500/20"
              >
                <span>Next: Review & Publish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: REVIEW & PUBLISH */}
        {/* ========================================================================= */}
        {activeStep === 4 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Course Summary Overview */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-lg font-bold text-slate-100">Step 4: Course Review Summary</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Review all sections, pricing, and curriculum before launching to students
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-slate-500">Course Title:</span>
                      <div className="font-bold text-slate-200 text-sm">{title}</div>
                      {subtitle && <div className="text-slate-400 text-[11px]">{subtitle}</div>}
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-slate-500">Subject & Difficulty:</span>
                      <div className="font-bold text-slate-200">{subject} • {level} Level</div>
                      <div className="text-emerald-400 font-mono font-bold mt-1">
                        Price: {Number(price) === 0 ? "FREE" : `₹${price}`}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-slate-500">Curriculum Volume:</span>
                      <div className="font-bold text-slate-200">
                        {totalSections} Section{totalSections !== 1 ? "s" : ""} • {totalLessons} Lesson{totalLessons !== 1 ? "s" : ""}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-slate-500">Outcomes & Prerequisites:</span>
                      <div className="font-bold text-slate-200">
                        {outcomes.length} Learning Outcomes • {reqs.length} Prerequisites
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-400 block mb-1">Course Description:</span>
                    <p className="text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Publish Requirement Checklist Drawer */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-100">Publish Checklist</h3>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                      course.checklist?.isPublishable
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {course.checklist?.isPublishable ? "Ready to Publish" : "Pending Checks"}
                  </span>
                </div>

                {course.checklist && !course.checklist.isPublishable ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0" /> Pending Items to Resolve:
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-amber-200/90 space-y-1 pl-1">
                      {!course.checklist.hasTitle && <li>Course Title (at least 4 characters)</li>}
                      {!course.checklist.hasDescription && <li>Course Description (at least 11 characters)</li>}
                      {!course.checklist.hasThumbnail && <li>Upload Course Thumbnail image</li>}
                      {!course.checklist.hasSubject && <li>Select or enter Subject Category</li>}
                      {!course.checklist.hasSections && <li>Add at least 1 Curriculum Section</li>}
                      {!course.checklist.hasLessons && <li>Add at least 1 Lesson</li>}
                      {!course.checklist.hasLessonContent && <li>Add Video or Text Content to lessons</li>}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>All course requirements satisfied! Ready to launch.</span>
                  </div>
                )}

                <div className="space-y-3 text-xs text-slate-300 pt-1 border-t border-slate-800">
                  {[
                    { key: "hasTitle", label: "Course Title", req: "At least 4 chars" },
                    { key: "hasDescription", label: "Course Description", req: "At least 11 chars" },
                    { key: "hasThumbnail", label: "Course Thumbnail", req: "Cover image uploaded" },
                    { key: "hasSubject", label: "Subject Category", req: "Valid subject set" },
                    { key: "hasSections", label: "Curriculum Sections", req: "At least 1 section" },
                    { key: "hasLessons", label: "Course Lessons", req: "At least 1 lesson" },
                    { key: "hasLessonContent", label: "Lesson Content", req: "Video or text added" },
                  ].map((item) => {
                    const isDone = Boolean(course.checklist?.[item.key]);
                    return (
                      <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div>
                          <div className="font-semibold text-slate-200">{item.label}</div>
                          <div className="text-[10px] text-slate-400">{item.req}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                              isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400 animate-pulse"
                            }`}
                          >
                            {isDone ? "Complete" : "Pending"}
                          </span>
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 4 Navigation Bar & Final Actions */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setActiveStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back: Settings & Pricing</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Link
                  href={`/courses/${course?.slug || courseId}/preview`}
                  target="_blank"
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition border border-slate-700"
                >
                  <Eye className="w-4 h-4" /> Student Preview
                </Link>

                {course.status === "PUBLISHED" ? (
                  <button
                    onClick={handleUnpublish}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold"
                  >
                    Unpublish Course
                  </button>
                ) : (
                  <button
                    onClick={handlePublish}
                    disabled={!course.checklist?.isPublishable}
                    className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl transition shadow-lg ${
                      course.checklist?.isPublishable
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/30 hover:scale-105"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Course Now</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Section Modal */}
        {showSectionModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-100">Add New Curriculum Section</h3>
              <form onSubmit={handleAddSection} className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 1: Introduction to Calculus"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none"
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowSectionModal(false)} className="text-xs text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white">
                    Add Section
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Lesson Modal */}
        {showLessonModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-100">Add New Lesson</h3>
              <form onSubmit={handleAddLesson} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Lesson Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lesson 1: Derivatives Concept"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Lesson Video Upload</label>
                  <label className="w-full py-3 px-4 text-xs font-semibold rounded-xl bg-slate-950 border border-slate-800 border-dashed text-slate-300 flex items-center justify-center gap-2 cursor-pointer hover:border-blue-500">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>{uploadingVideo ? "Uploading Video..." : uploadedVideoAssetId ? "Video Selected ✓" : "Upload Video Lesson File"}</span>
                    <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="preview"
                    checked={lessonIsPreview}
                    onChange={(e) => setLessonIsPreview(e.target.checked)}
                    className="text-blue-600 rounded"
                  />
                  <label htmlFor="preview" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Mark as Free Preview Lesson
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowLessonModal(false)} className="text-xs text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white">
                    Save Lesson
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
