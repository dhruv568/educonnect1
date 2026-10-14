"use client";

import React from "react";
import { DocumentItem } from "@/types/auth";
import { X, FileText, Image as ImageIcon, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentViewerModal({ document, isOpen, onClose }: DocumentViewerModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !document) return null;

  const secureUrl = `/api/documents/${document.id}`;
  const isImage = document.fileType.startsWith("image/");
  const isPdf = document.fileType === "application/pdf";

  const formattedSize = (document.fileSize / 1024).toFixed(1) + " KB";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Document Viewer: ${document.fileName}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              {isImage ? <ImageIcon className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg">{document.fileName}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-200 text-slate-700">
                  {document.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{document.fileType}</span>
                <span>•</span>
                <span>{formattedSize}</span>
                <span>•</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Secure Authorized Stream
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={secureUrl}
              download={document.fileName}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <Download className="h-4 w-4" /> Download Original
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Close document viewer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Modal Content / Preview Box */}
        <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto min-h-[400px]">
          {isImage ? (
            <img
              src={secureUrl}
              alt={document.fileName}
              className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
            />
          ) : isPdf ? (
            <iframe
              src={secureUrl}
              title={document.fileName}
              className="w-full h-[65vh] rounded-xl border border-slate-800 bg-white"
            />
          ) : (
            <div className="text-center p-12 text-slate-400 space-y-4">
              <FileText className="h-16 w-16 mx-auto text-slate-600" />
              <p className="text-sm">Preview not available directly for this file format.</p>
              <a
                href={secureUrl}
                download={document.fileName}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700"
              >
                <Download className="h-4 w-4" /> Download File ({formattedSize})
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
