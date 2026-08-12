"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  avatarPath?: string | null;
  onChange: (avatarPath: string | null) => void;
};

export function AvatarUploader({ avatarPath, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Upload fehlgeschlagen");
      }
      onChange(data.avatarPath as string);
      toast.success("Avatar gespeichert");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Entfernen fehlgeschlagen");
      }
      onChange(null);
      toast.success("Avatar entfernt");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Entfernen fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
      {avatarPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarPath}
          alt="Avatar"
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          {avatarPath ? "Avatar ersetzen" : "Avatar hochladen"}
        </Button>
        {avatarPath ? (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => void remove()}
          >
            <Trash2 className="h-4 w-4" />
            Entfernen
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
