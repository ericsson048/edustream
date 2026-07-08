import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bold,
  Code,
  Columns3,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { Link as RouterLink, useParams } from "react-router-dom";
import InstructorSidebar from "../../../../../../../components/InstructorSidebar";
import Header from "../../../../../../../components/Header";
import MarkdownRenderer from "../../../../../../../components/MarkdownRenderer";
import { aiService } from "../../../../../../../services/aiService";
import { courseService } from "../../../../../../../services/courseService";
import { escapeHtml } from "../../../../../../../utils/md";
import { useToast } from "../../../../../../../contexts/ToastContext";
import type { CourseLesson } from "../../../../../../../types/lms";

type ImageOpts = {
  url: string;
  alt: string;
  width: number;
  align: "left" | "center" | "right";
};

type SideBySideOpts = {
  imageUrl: string;
  alt: string;
  width: number;
  align: "left" | "center" | "right";
  position: "left" | "right";
  markdown: string;
};

const ALIGN_CLASSES: Record<string, string> = {
  left: "",
  center: "margin: 0 auto; display: block;",
  right: "margin: 0 0 0 auto; display: block;",
};

const AUTO_SAVE_MS = 3000;

export default function LessonContentEditor() {
  const { courseId = "", lessonId = "" } = useParams();
  const { showToast } = useToast();
  const [lesson, setLesson] = useState<CourseLesson | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");
  const [dialogMode, setDialogMode] = useState<"image" | "side" | "ai" | null>(null);
  const [imageOpts, setImageOpts] = useState<ImageOpts>({
    url: "",
    alt: "",
    width: 800,
    align: "center",
  });
  const [sideOpts, setSideOpts] = useState<SideBySideOpts>({
    imageUrl: "",
    alt: "",
    width: 800,
    align: "center",
    position: "left",
    markdown: "",
  });
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!lessonId) return;
    courseService
      .getLesson(lessonId)
      .then(setLesson)
      .catch(() => {
        showToast("Impossible de charger la leçon.", "error");
      });
  }, [lessonId, showToast]);

  useEffect(() => {
    if (lesson) setContent(lesson.content || "");
  }, [lesson]);

  const handleAiGenerate = useCallback(async (mode: "generate" | "improve") => {
    const prompt = aiPrompt.trim();
    if (!prompt) return;
    setAiLoading(true);
    setAiResult("");
    try {
      const existing = mode === "improve" ? content : "";
      const fullPrompt = mode === "improve"
        ? `Improve the following lesson content. ${prompt}\n\nCurrent content:\n${existing}`
        : prompt;
      const result = await aiService.generateLesson({
        prompt: fullPrompt,
        course_title: lesson?.title || "",
        module_title: "",
        lesson_title: prompt.slice(0, 80),
      });
      setAiResult(result.content);
    } catch {
      showToast("Erreur generation IA.", "error");
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, content, lesson?.title, showToast]);

  const insertAiResult = () => {
    if (!aiResult) return;
    const ta = editorRef.current;
    if (ta) {
      const start = ta.selectionStart;
      onChange(content.slice(0, start) + "\n" + aiResult + "\n" + content.slice(ta.selectionEnd));
    } else {
      onChange(content + "\n" + aiResult);
    }
    setAiPrompt("");
    setAiResult("");
    setDialogMode(null);
  };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await courseService.updateLesson(lessonId, { content });
      setDirty(false);
    } catch {
      showToast("Erreur lors de l'enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  }, [content, lessonId, showToast]);

  useEffect(() => {
    if (!dirty) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(save, AUTO_SAVE_MS);
    return () => clearTimeout(autoSaveTimer.current);
  }, [dirty, save]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  const insertLink = useCallback(() => {
    const ta = editorRef.current;
    if (!ta) return;
    const sel = content.slice(ta.selectionStart, ta.selectionEnd);
    insertAtCursor("[", sel ? `](${sel})` : "text](url)");
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (viewMode !== "source") return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    if (e.key === "b") {
      e.preventDefault();
      wrapInline("**");
    } else if (e.key === "i") {
      e.preventDefault();
      wrapInline("_");
    } else if (e.key === "k") {
      e.preventDefault();
      insertLink();
    }
  };

  const onChange = (val: string) => {
    setContent(val);
    setDirty(true);
  };

  const insertAtCursor = (prefix: string, suffix = "") => {
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = content.slice(start, end);
    const before = content.slice(0, start);
    const after = content.slice(end);
    const wrapped = prefix + sel + suffix;
    onChange(before + wrapped + after);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + wrapped.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const wrapInline = (chr: string) => insertAtCursor(chr, chr);
  const wrapBlock = (prefix: string) => {
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const needsBreak = before.length > 0 && !before.endsWith("\n\n");
    onChange(
      before +
        (needsBreak ? "\n" : "") +
        prefix +
        (content.slice(start, end) || "text") +
        "\n" +
        after,
    );
    requestAnimationFrame(() => ta.focus());
  };

  const insertImageHtml = () => {
    const { url, alt, width, align } = imageOpts;
    if (!url) return;
    const style = ALIGN_CLASSES[align];
    const imgTag = `\n<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" width="${width}" style="${escapeHtml(style)}" />\n`;
    const ta = editorRef.current;
    if (ta) {
      const start = ta.selectionStart;
      onChange(
        content.slice(0, start) + imgTag + content.slice(ta.selectionEnd),
      );
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + imgTag.length;
        ta.setSelectionRange(pos, pos);
      });
    }
    setDialogMode(null);
    setImageOpts({ url: "", alt: "", width: 800, align: "center" });
  };

  const insertSideLayout = () => {
    const { imageUrl, alt, width, align, position, markdown } = sideOpts;
    if (!imageUrl) return;
    const imgStyle = ALIGN_CLASSES[align];
    const imgHtml = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" width="${width}" style="${escapeHtml(imgStyle)}" />`;
    const mdHtml = `<!--sbsmd-->\n${markdown}\n<!--/sbsmd-->`;
    const [first, second] =
      position === "left"
        ? [
            `<div style="flex: 1; min-width: 280px;">\n      ${imgHtml}\n    </div>`,
            `<div style="flex: 1; min-width: 280px;">\n      ${mdHtml}\n    </div>`,
          ]
        : [
            `<div style="flex: 1; min-width: 280px;">\n      ${mdHtml}\n    </div>`,
            `<div style="flex: 1; min-width: 280px;">\n      ${imgHtml}\n    </div>`,
          ];
    const html = `\n<div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap;">\n  ${first}\n  ${second}\n</div>\n`;
    const ta = editorRef.current;
    if (ta) {
      const start = ta.selectionStart;
      onChange(content.slice(0, start) + html + content.slice(ta.selectionEnd));
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + html.length;
        ta.setSelectionRange(pos, pos);
      });
    }
    setDialogMode(null);
    setSideOpts({
      imageUrl: "",
      alt: "",
      width: 800,
      align: "center",
      position: "left",
      markdown: "",
    });
  };

  const uploadImage = useCallback(
    async (file: File, target: "image" | "side") => {
      setUploading(true);
      try {
        const url = await courseService.uploadImage(file);
        if (target === "side") {
          setSideOpts((prev) => ({ ...prev, imageUrl: url }));
        } else {
          setImageOpts((prev) => ({ ...prev, url }));
          setDialogMode("image");
        }
      } catch {
        showToast("Erreur lors de l'upload.", "error");
      } finally {
        setUploading(false);
      }
    },
    [showToast],
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file, dialogMode === "side" ? "side" : "image");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    await uploadImage(file, "image");
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const formatToolbar = [
    { icon: Bold, label: "Bold (Ctrl+B)", action: () => wrapInline("**") },
    { icon: Italic, label: "Italic (Ctrl+I)", action: () => wrapInline("_") },
    { icon: Heading2, label: "H2", action: () => wrapBlock("## ") },
    { icon: Heading3, label: "H3", action: () => wrapBlock("### ") },
    { icon: List, label: "Bullet list", action: () => wrapBlock("- ") },
    {
      icon: ListOrdered,
      label: "Ordered list",
      action: () => wrapBlock("1. "),
    },
    { icon: Code, label: "Code block", action: () => wrapBlock("```\n") },
    { icon: Quote, label: "Blockquote", action: () => wrapBlock("> ") },
    { icon: Link2, label: "Link (Ctrl+K)", action: insertLink },
  ];

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;

  if (!lesson) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <InstructorSidebar />
        <main className="flex-1 ml-64">
          <Header />
          <div className="flex items-center justify-center py-32 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            Loading lesson...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <RouterLink
              to={`/instructor/courses/${courseId}`}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to course
            </RouterLink>
            <span className="text-sm text-slate-300">/</span>
            <h1 className="text-lg font-bold text-slate-800 truncate max-w-md">
              {lesson.title}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">
              {words} words &middot; {chars} chars
            </span>
            {dirty && (
              <span className="text-xs text-amber-500 font-medium">
                Unsaved
              </span>
            )}
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="h-[calc(100vh-140px)] flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-2 py-1 bg-slate-50">
            <div className="flex items-center gap-0.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => {
                  setDialogMode("image");
                  setImageOpts({
                    url: "",
                    alt: "",
                    width: 800,
                    align: "center",
                  });
                }}
                disabled={uploading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
              >
                {uploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImageIcon size={14} />
                )}
                {uploading ? "Uploading..." : "Image"}
              </button>
              <button
                onClick={() => {
                  setDialogMode("side");
                  setSideOpts({
                    imageUrl: "",
                    alt: "",
                    width: 800,
                    align: "center",
                    position: "left",
                    markdown: "",
                  });
                }}
                disabled={uploading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
              >
                <Columns3 size={14} />
                Side by side
              </button>
              <span className="w-px h-5 bg-slate-200 mx-1"></span>
              <button
                onClick={() => { setDialogMode("ai"); setAiPrompt(""); setAiResult(""); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors"
              >
                <Sparkles size={14} />
                AI Generate
              </button>
              {viewMode === "source" && (
                <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-slate-200">
                  {formatToolbar.map((t) => (
                    <button
                      key={t.label}
                      onClick={t.action}
                      aria-label={t.label}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <t.icon size={15} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className="flex bg-slate-200 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("preview")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === "preview" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setViewMode("source")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === "source" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Source
                </button>
              </div>
            </div>
          </div>
          {viewMode === "source" ? (
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex-1 resize-none border-0 p-4 text-sm font-mono leading-relaxed focus:outline-none bg-white dark:bg-slate-900 dark:text-slate-100"
              placeholder="Write your lesson content in Markdown..."
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-900">
              {content ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p className="text-sm text-slate-400 italic">
                  Add images, text, and side-by-side layouts using the toolbar
                  above.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {dialogMode === "image" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Insert Image</h3>
              <button
                onClick={() => setDialogMode(null)}
                className="p-1 rounded hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    value={imageOpts.url}
                    onChange={(e) =>
                      setImageOpts((p) => ({ ...p, url: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://..."
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Upload
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Alt text
                </label>
                <input
                  value={imageOpts.alt}
                  onChange={(e) =>
                    setImageOpts((p) => ({ ...p, alt: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Description..."
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={1920}
                    value={imageOpts.width}
                    onChange={(e) =>
                      setImageOpts((p) => ({
                        ...p,
                        width: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Alignment
                  </label>
                  <select
                    value={imageOpts.align}
                    onChange={(e) =>
                      setImageOpts((p) => ({
                        ...p,
                        align: e.target.value as ImageOpts["align"],
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
              {imageOpts.url && (
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <p className="text-xs text-slate-500 mb-2">Preview</p>
                  <img
                    src={imageOpts.url}
                    alt={imageOpts.alt}
                    width={Math.min(imageOpts.width, 400)}
                    style={{
                      ...(ALIGN_CLASSES[imageOpts.align]
                        ? { margin: "0 auto", display: "block" }
                        : {}),
                    }}
                    className="rounded-lg max-h-40 object-contain"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDialogMode(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={insertImageHtml}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {dialogMode === "ai" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Content Generator
              </h3>
              <button onClick={() => setDialogMode(null)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Describe the lesson content you want to generate..."
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleAiGenerate("generate")}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {aiLoading ? "Generating..." : "Generate"}
                </button>
                <button
                  onClick={() => handleAiGenerate("improve")}
                  disabled={aiLoading || !aiPrompt.trim() || !content.trim()}
                  className="px-5 py-2.5 rounded-xl border border-purple-200 text-sm font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50 transition-colors"
                >
                  Improve Existing
                </button>
              </div>
              {aiResult && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">Generated Content</p>
                    <button
                      onClick={insertAiResult}
                      className="px-4 py-1.5 rounded-lg bg-purple-600 text-xs font-bold text-white hover:bg-purple-700 transition-colors"
                    >
                      Insert into Editor
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-lg bg-white p-4 border border-purple-100 text-sm">
                    <MarkdownRenderer content={aiResult} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {dialogMode === "side" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Side-by-Side Layout</h3>
              <button
                onClick={() => setDialogMode(null)}
                className="p-1 rounded hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Image URL
                  </label>
                  <input
                    value={sideOpts.imageUrl}
                    onChange={(e) =>
                      setSideOpts((p) => ({ ...p, imageUrl: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://..."
                  />
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Upload
                </button>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Alt text
                  </label>
                  <input
                    value={sideOpts.alt}
                    onChange={(e) =>
                      setSideOpts((p) => ({ ...p, alt: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Description..."
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={1920}
                    value={sideOpts.width}
                    onChange={(e) =>
                      setSideOpts((p) => ({
                        ...p,
                        width: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Alignment
                  </label>
                  <select
                    value={sideOpts.align}
                    onChange={(e) =>
                      setSideOpts((p) => ({
                        ...p,
                        align: e.target.value as ImageOpts["align"],
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Image side
                  </label>
                  <select
                    value={sideOpts.position}
                    onChange={(e) =>
                      setSideOpts((p) => ({
                        ...p,
                        position: e.target.value as "left" | "right",
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Text side (Markdown)
                </label>
                <textarea
                  value={sideOpts.markdown}
                  onChange={(e) =>
                    setSideOpts((p) => ({ ...p, markdown: e.target.value }))
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Write your **markdown** content here..."
                />
              </div>
              {sideOpts.imageUrl && (
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <p className="text-xs text-slate-500 mb-2">Preview</p>
                  <div className="flex gap-6 items-start">
                    {sideOpts.position === "left" && (
                      <img
                        src={sideOpts.imageUrl}
                        alt={sideOpts.alt}
                        width={Math.min(sideOpts.width, 240)}
                        className="rounded-lg max-h-32 object-contain"
                      />
                    )}
                    <div className="flex-1 text-xs text-slate-400 italic p-2 border border-dashed border-slate-300 rounded">
                      {sideOpts.markdown
                        ? sideOpts.markdown
                            .split("\n")
                            .slice(0, 3)
                            .map((l, i) => <p key={i}>{l}</p>)
                        : "Text side"}
                    </div>
                    {sideOpts.position === "right" && (
                      <img
                        src={sideOpts.imageUrl}
                        alt={sideOpts.alt}
                        width={Math.min(sideOpts.width, 240)}
                        className="rounded-lg max-h-32 object-contain"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDialogMode(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={insertSideLayout}
                disabled={!sideOpts.imageUrl}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
