"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { WhiteboardElement } from "@/types/classroom";
import {
  PenTool,
  Eraser,
  Highlighter,
  RotateCcw,
  RotateCw,
  Trash2,
  Lock,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";

interface WhiteboardPanelProps {
  initialElements: WhiteboardElement[];
  canDraw: boolean;
  isTeacher: boolean;
  onSaveState: (elements: WhiteboardElement[]) => Promise<void> | void;
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function WhiteboardPanel({
  initialElements,
  canDraw,
  isTeacher,
  onSaveState,
  onClose,
  isExpanded = false,
  onToggleExpand,
}: WhiteboardPanelProps) {
  const [elements, setElements] = useState<WhiteboardElement[]>(initialElements || []);
  const [tool, setTool] = useState<"pen" | "eraser" | "highlight">("pen");
  const [color, setColor] = useState("#3b82f6"); // Default blue
  const [size, setSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoStack, setUndoStack] = useState<WhiteboardElement[][]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardElement[][]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);

  // Synchronize remote changes from initialElements when not actively drawing
  useEffect(() => {
    if (initialElements && !isDrawing) {
      setElements(initialElements);
    }
  }, [initialElements, isDrawing]);

  // Redraw canvas whenever elements change
  useEffect(() => {
    redrawCanvas();
  }, [elements]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach((el) => {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (el.type === "pen" || el.type === "eraser" || el.type === "highlight") {
        if (el.type === "eraser") {
          ctx.strokeStyle = "#090d16"; // Match dark canvas background
          ctx.lineWidth = el.size * 3;
        } else if (el.type === "highlight") {
          ctx.strokeStyle = `${el.color}55`; // Semi-transparent
          ctx.lineWidth = el.size * 3.5;
        }

        if (el.points && el.points.length > 0) {
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
        }
      } else if (el.type === "rectangle") {
        ctx.strokeRect(el.x || 0, el.y || 0, el.width || 0, el.height || 0);
      } else if (el.type === "circle") {
        const radius = Math.sqrt(Math.pow(el.width || 0, 2) + Math.pow(el.height || 0, 2)) / 2;
        ctx.arc((el.x || 0) + radius, (el.y || 0) + radius, Math.max(1, radius), 0, 2 * Math.PI);
        ctx.stroke();
      } else if (el.type === "line") {
        ctx.moveTo(el.x || 0, el.y || 0);
        ctx.lineTo((el.x || 0) + (el.width || 0), (el.y || 0) + (el.height || 0));
        ctx.stroke();
      } else if (el.type === "text" && el.text) {
        ctx.font = `${el.size * 5}px sans-serif`;
        ctx.fillText(el.text, el.x || 0, el.y || 0);
      }
    });
  }, [elements]);

  // Scaled coordinates mapping screen pixels to fixed 1200x800 canvas coordinate space
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    currentPathRef.current = [coords];

    setUndoStack((prev) => [...prev, elements]);
    setRedoStack([]);

    // Draw initial dot
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.fillStyle = tool === "eraser" ? "#090d16" : tool === "highlight" ? `${color}55` : color;
        const radius = tool === "highlight" ? (size * 3.5) / 2 : tool === "eraser" ? (size * 3) / 2 : size / 2;
        ctx.arc(coords.x, coords.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canDraw) return;
    const coords = getCanvasCoords(e);
    currentPathRef.current.push(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = tool === "eraser" ? "#090d16" : tool === "highlight" ? `${color}55` : color;
    ctx.lineWidth = tool === "highlight" ? size * 3.5 : tool === "eraser" ? size * 3 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const pts = currentPathRef.current;
    if (pts.length > 1) {
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canDraw) return;
    setIsDrawing(false);

    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }

    if (currentPathRef.current.length > 0) {
      const newElement: WhiteboardElement = {
        id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: tool,
        points: [...currentPathRef.current],
        color,
        size,
      };

      const updatedElements = [...elements, newElement];
      setElements(updatedElements);
      currentPathRef.current = [];
      onSaveState(updatedElements);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || !canDraw) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, elements]);
    setElements(previous);
    setUndoStack((prev) => prev.slice(0, -1));
    onSaveState(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !canDraw) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, elements]);
    setElements(next);
    setRedoStack((prev) => prev.slice(0, -1));
    onSaveState(next);
  };

  const handleClear = () => {
    if (!canDraw) return;
    setUndoStack((prev) => [...prev, elements]);
    setRedoStack([]);
    setElements([]);
    onSaveState([]);
  };

  const presetColors = [
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#a855f7", // Purple
    "#ffffff", // White
  ];

  return (
    <div className="w-full h-full bg-[#0d111a] border-l border-slate-800 flex flex-col overflow-hidden text-slate-100 select-none">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <PenTool className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white">Digital Whiteboard</h3>
            <p className="text-[10px] text-slate-400">
              {canDraw ? "Interactive Drawing Live" : "View-only Mode"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isExpanded ? "Collapse View" : "Expand Whiteboard"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Whiteboard"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Drawing Toolbar */}
      <div className="p-2.5 border-b border-slate-800/90 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Tools Group */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canDraw}
            onClick={() => setTool("pen")}
            className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-all ${
              tool === "pen"
                ? "bg-blue-600 text-white shadow-sm"
                : "hover:bg-slate-800 text-slate-400 disabled:opacity-40"
            }`}
            title="Pen"
          >
            <PenTool className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold hidden xs:inline">Pen</span>
          </button>

          <button
            type="button"
            disabled={!canDraw}
            onClick={() => setTool("highlight")}
            className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-all ${
              tool === "highlight"
                ? "bg-blue-600 text-white shadow-sm"
                : "hover:bg-slate-800 text-slate-400 disabled:opacity-40"
            }`}
            title="Highlighter"
          >
            <Highlighter className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold hidden xs:inline">Highlight</span>
          </button>

          <button
            type="button"
            disabled={!canDraw}
            onClick={() => setTool("eraser")}
            className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-all ${
              tool === "eraser"
                ? "bg-blue-600 text-white shadow-sm"
                : "hover:bg-slate-800 text-slate-400 disabled:opacity-40"
            }`}
            title="Eraser"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold hidden xs:inline">Eraser</span>
          </button>
        </div>

        {/* Colors & Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Color Swatches */}
          {canDraw && (
            <div className="flex items-center gap-1 mr-1">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    color === c ? "scale-110 ring-2 ring-blue-400 border-white" : "border-slate-700/80 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}

          {/* Stroke Width Selector */}
          {canDraw && (
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-[11px] h-7 px-1.5 focus:outline-none"
              title="Stroke Width"
            >
              <option value={2}>Thin</option>
              <option value={4}>Medium</option>
              <option value={8}>Thick</option>
            </select>
          )}

          {/* Undo / Redo */}
          <button
            type="button"
            disabled={!canDraw || undoStack.length === 0}
            onClick={handleUndo}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all"
            title="Undo"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            disabled={!canDraw || redoStack.length === 0}
            onClick={handleRedo}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all"
            title="Redo"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          {/* Clear Canvas (Host or Allowed Drawers) */}
          {(isTeacher || canDraw) && (
            <button
              type="button"
              disabled={!canDraw || elements.length === 0}
              onClick={handleClear}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 disabled:opacity-30 transition-all ml-0.5"
              title="Clear Canvas"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Lock Notice for Students when drawing disabled */}
      {!canDraw && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 flex items-center justify-center gap-2 text-amber-300 text-xs font-semibold shrink-0">
          <Lock className="h-3.5 w-3.5" /> Student drawing is view-only (Controlled by Educator)
        </div>
      )}

      {/* High-Resolution Drawing Canvas */}
      <div className="flex-1 bg-[#090d16] relative overflow-hidden flex items-center justify-center p-2 min-h-0">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: "none" }}
          className={`w-full h-full border border-slate-800/90 rounded-2xl bg-[#090d16] shadow-2xl ${
            canDraw ? "cursor-crosshair" : "cursor-default"
          }`}
        />
      </div>
    </div>
  );
}
