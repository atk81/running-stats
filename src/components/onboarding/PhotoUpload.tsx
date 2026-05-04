"use client";

import {
  useRef,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
} from "react";
import { Icon } from "@/components/primitives";

export interface PhotoUploadProps {
  accent: string;
  hasPhoto: boolean;
  uploading: boolean;
  errorMessage: string | null;
  onSelectFile: (file: File) => void;
}

const dropZoneStyle = (active: boolean): CSSProperties => ({
  border: `1.5px dashed ${active ? "var(--ignite)" : "var(--border-strong)"}`,
  borderRadius: 16,
  padding: 32,
  display: "grid",
  placeItems: "center",
  background: "#FBFBFD",
  minHeight: 280,
  cursor: "pointer",
  transition: "border-color 120ms, background 120ms",
});

const captionStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  marginTop: 12,
  color: "var(--ink)",
};

const subtleStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--fg-3)",
  marginTop: 6,
};

export function PhotoUpload({
  accent,
  hasPhoto,
  uploading,
  errorMessage,
  onSelectFile,
}: PhotoUploadProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File | undefined) => {
    if (file) onSelectFile(file);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div>
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={dropZoneStyle(hasPhoto)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
      >
        {uploading ? (
          <div style={{ textAlign: "center" }}>
            <Icon name="upload" size={32} color="var(--fg-3)" />
            <div style={captionStyle}>Uploading…</div>
            <div style={subtleStyle}>hold tight</div>
          </div>
        ) : hasPhoto ? (
          <div style={{ textAlign: "center" }}>
            <Icon name="check" size={28} color={accent} />
            <div style={{ ...captionStyle, marginTop: 8 }}>Photo uploaded</div>
            <div style={{ ...subtleStyle, marginTop: 4 }}>tap to replace</div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <Icon name="upload" size={32} color="var(--fg-3)" />
            <div style={captionStyle}>Drop a photo, or click to upload</div>
            <div style={subtleStyle}>PNG / JPG / WEBP &middot; up to 10MB</div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          style={{ display: "none" }}
        />
      </div>
      {errorMessage && (
        <div
          role="alert"
          style={{
            marginTop: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ignite-deep)",
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
