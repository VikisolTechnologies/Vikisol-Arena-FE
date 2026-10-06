"use client";

import { useId, useRef, useState } from "react";
import { m } from "motion/react";
import { Camera } from "lucide-react";
import { press, spring } from "@/lib/motion";
import { initials } from "@/components/bplus/Avatar";

/** Downscales on-device before anything is stored, so a 12MP phone photo never sits in memory
 *  or storage at full size. Returns a JPEG data URL (≈256px square). */
async function downscale(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't prepare the photo.");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function PhotoPicker({
  value,
  name,
  onChange,
  label = "Add a photo (optional)",
}: {
  value: string | null;
  name: string;
  onChange: (dataUrl: string | null) => void;
  label?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  return (
    <div className="flex items-center gap-4">
      <m.button
        type="button"
        onClick={() => input.current?.click()}
        whileTap={press}
        transition={spring.snappy}
        aria-describedby={`${id}-label`}
        aria-label={value ? "Change photo" : "Add a photo"}
        className="relative size-24 shrink-0 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local data URL; next/image adds nothing here
          <img src={value} alt="" className="size-24 rounded-full object-cover" />
        ) : (
          <span className="grid size-24 place-items-center rounded-full border-[1.5px] border-dashed border-field-line bg-surface font-display-serif text-[30px] text-faint">
            {initials(name)}
          </span>
        )}
        <span className="absolute bottom-0.5 right-0.5 grid size-8 place-items-center rounded-full border-2 border-background bg-foreground text-background">
          <Camera className="size-4" strokeWidth={2} aria-hidden />
        </span>
      </m.button>
      <div>
        <p id={`${id}-label`} className="text-[15px] text-foreground">
          {label}
        </p>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="min-h-11 text-[14px] text-faint underline-offset-4 hover:underline">
            Remove photo
          </button>
        )}
        {error && (
          <p className="text-[13px] text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setError("");
          try {
            onChange(await downscale(file));
          } catch {
            setError("That photo couldn't be read. Try a JPEG or PNG.");
          }
        }}
      />
    </div>
  );
}
