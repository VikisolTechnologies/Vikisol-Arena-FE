"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** window.print() -> "Save as PDF" is a real, dependency-free export; .arena-print-cv in
 * globals.css scopes the printed page to just the CV element. */
export function DownloadPdfButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
      <Download className="size-3.5" /> {label}
    </Button>
  );
}
