import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { FileX2, Loader2 } from "lucide-react";

interface ExcelPreviewProps {
  fileUrl: string;
}

export default function ExcelPreview({ fileUrl }: ExcelPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<(string | number)[][]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (cancelled) return;
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
        }) as (string | number)[][];
        setRows(matrix.slice(0, 200));
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("Impossible de lire le fichier Excel");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <p className="mt-4 text-sm text-slate-600">Chargement du tableau...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
        <FileX2 className="w-14 h-14 text-red-500" />
        <p className="mt-4 text-slate-600">{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-slate-500">
        Fichier vide.
      </div>
    );
  }

  const colCount = Math.max(...rows.map((row) => row.length), 0);

  return (
    <div className="bg-white rounded shadow p-4 overflow-auto">
      <table className="border-collapse text-xs">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri === 0 ? "bg-slate-100 font-bold" : "hover:bg-slate-50"}>
              {Array.from({ length: colCount }).map((_, ci) => (
                <td key={ci} className="border border-slate-200 px-2 py-1 whitespace-nowrap max-w-[320px] truncate">
                  {row[ci] != null ? String(row[ci]) : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
