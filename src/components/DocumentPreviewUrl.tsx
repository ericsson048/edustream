import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import ExcelPreview from "./ExcelPreview";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import {
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileX2,
  Loader2,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface DocumentPreviewUrlProps {
  documentUrl: string;
  documentName?: string;
  onClose?: () => void;
}

export default function DocumentPreviewUrl({
  documentUrl,
  documentName = "Document",
  onClose,
}: DocumentPreviewUrlProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(false);

  const defaultLayoutPluginInstance = useRef(defaultLayoutPlugin()).current;
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const extension = documentUrl?.split(".").pop()?.split("?")[0].toLowerCase();
  const isPdf = extension === "pdf";
  const isDoc = ["doc", "docx"].includes(extension || "");
  const isExcel = ["xls", "xlsx"].includes(extension || "");
  const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(extension || "");

  useEffect(() => {
    if (!documentUrl) return;

    setLoading(true);
    setError(null);

    if (!isDoc) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(documentUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (cancelled) return;
        if (docxContainerRef.current) docxContainerRef.current.innerHTML = "";
        return renderAsync(buffer, docxContainerRef.current!);
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setError("Impossible de lire le document Word");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [documentUrl, isDoc]);

  if (!documentUrl) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = documentUrl;
    link.download = documentName;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const FileIcon: LucideIcon = isPdf
    ? FileText
    : isDoc
      ? FileText
      : isExcel
        ? FileSpreadsheet
        : isImage
          ? FileImage
          : File;
  const iconColor = isPdf
    ? "text-red-500"
    : isDoc
      ? "text-blue-500"
      : isExcel
        ? "text-green-500"
        : isImage
          ? "text-purple-500"
          : "text-gray-500";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div
        className={`bg-white shadow-2xl flex flex-col overflow-hidden ${
          maximized ? "w-full h-full rounded-none" : "w-full max-w-5xl h-[90vh] rounded-2xl"
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileIcon className={`w-5 h-5 shrink-0 ${iconColor}`} />
            <span className="font-semibold text-slate-800 truncate">{documentName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" /> Télécharger
            </button>
            <button
              onClick={() => setMaximized((m) => !m)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title={maximized ? "Réduire" : "Agrandir"}
            >
              {maximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 p-1 relative overflow-y-auto">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/75">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="mt-4 text-sm text-slate-600">Chargement...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center min-h-96 p-6 text-center">
              <FileX2 className="w-14 h-14 text-red-500" />
              <p className="mt-4 text-slate-600">{error}</p>
              <button
                onClick={handleDownload}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" /> Télécharger
              </button>
            </div>
          )}

          {isPdf && !error && (
            <div className="min-h-full bg-white">
              <Worker workerUrl={workerUrl}>
                <Viewer fileUrl={documentUrl} plugins={[defaultLayoutPluginInstance]} />
              </Worker>
            </div>
          )}

          {isDoc && !error && <div ref={docxContainerRef} className="p-4 bg-white min-h-full" />}

          {isExcel && !error && (
            <div className="bg-white">
              <ExcelPreview fileUrl={documentUrl} />
            </div>
          )}

          {isImage && !error && (
            <div className="flex items-center justify-center bg-white p-8 min-h-full">
              <img
                src={documentUrl}
                alt={documentName}
                className="max-w-full max-h-[70vh] object-contain rounded shadow"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError("Impossible de charger l'image");
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
