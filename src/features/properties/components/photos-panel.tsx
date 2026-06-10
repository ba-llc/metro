"use client";

import { useRef, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { assetUrl, uploadAsset } from "@/lib/api";
import { useCreatePhoto, useDeletePhoto } from "../hooks";
import type { PhotoRecord } from "../types";

export function PhotosPanel({
  propertyId,
  photos,
}: {
  propertyId: string;
  photos: PhotoRecord[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createPhoto = useCreatePhoto(propertyId);
  const deletePhoto = useDeletePhoto(propertyId);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const asset = await uploadAsset({
          file,
          filename: file.name,
          folder: `properties/${propertyId}/photos`,
        });
        await createPhoto.mutateAsync({
          assetId: asset.id,
          category: photos.length === 0 ? "hero" : undefined,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader
        title="Photos"
        action={
          <Button
            size="sm"
            variant="secondary"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            Upload Photos
          </Button>
        }
      />
      <CardContent>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        {photos.length === 0 ? (
          <EmptyState
            title="No photos yet"
            description="The first photo becomes the hero image on covers and email flyers."
          />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative overflow-hidden rounded-md border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assetUrl(photo.assetId)}
                  alt={photo.caption ?? photo.asset.filename}
                  className="aspect-[4/3] w-full object-cover"
                />
                {photo.category === "hero" ? (
                  <span className="absolute left-2 top-2 rounded bg-brand-900/90 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                    Hero
                  </span>
                ) : null}
                <button
                  onClick={() => deletePhoto.mutate(photo.id)}
                  className="absolute right-2 top-2 hidden rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white group-hover:block"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
