"use client";

import {
  useRef,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
} from "react";
import { FieldError, Icon, type IconName } from "@/components/primitives";

export interface PhotoUploadProps {
  accent: string;
  hasPhoto: boolean;
  uploading: boolean;
  errorMessage: string | null;
  onSelectFile: (file: File) => void;
}

interface DropZoneStatus {
  icon: IconName;
  iconColor: string;
  caption: string;
  sub: string;
}

function statusFor(
  uploading: boolean,
  hasPhoto: boolean,
  accent: string,
): DropZoneStatus {
  if (uploading) {
    return {
      icon: "upload",
      iconColor: "var(--fg-3)",
      caption: "Uploading…",
      sub: "hold tight",
    };
  }
  if (hasPhoto) {
    return {
      icon: "check",
      iconColor: accent,
      caption: "Photo uploaded",
      sub: "tap to replace",
    };
  }
  return {
    icon: "upload",
    iconColor: "var(--fg-3)",
    caption: "Drop a photo, or click to upload",
    sub: "PNG / JPG / WEBP · up to 10MB",
  };
}

const dropZoneStyle = (active: boolean): CSSProperties => ({
  position: "relative",
  border: `1.5px dashed ${active ? "var(--ignite)" : "var(--border-strong)"}`,
  borderRadius: 16,
  padding: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#FBFBFD",
  minHeight: 280,
  height: "100%",
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
  const status = statusFor(uploading, hasPhoto, accent);

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

  return (
    <div>
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Icon name={status.icon} size={32} color={status.iconColor} />
          <div style={captionStyle}>{status.caption}</div>
          <div style={subtleStyle}>{status.sub}</div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          style={{
            position: "absolute",
            width: 0,
            height: 0,
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      </div>
      {errorMessage && (
        <FieldError style={{ marginTop: 10 }}>{errorMessage}</FieldError>
      )}
    </div>
  );
}
