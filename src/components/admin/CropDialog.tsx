import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { RotateCw, Undo2 } from 'lucide-react';
import Dialog from '../ui/Dialog';

/**
 * What the server needs to crop: fractions (0–1) of the upright photo after the
 * clockwise quarter-turn `rotate`. The server crops its own copy and keeps the original
 * file untouched (backend/cms/images.py parse_crop / apply_crop).
 */
export interface CropSpec { x: number; y: number; w: number; h: number; rotate: number }

const SHAPES = [
  { key: 'original', label: 'Original' },
  { key: '16:10', label: 'Car card 16:10', ratio: 16 / 10 },
  { key: '16:9', label: 'Wide 16:9', ratio: 16 / 9 },
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
  { key: '1:1', label: 'Square', ratio: 1 },
  { key: '3:4', label: 'Portrait 3:4', ratio: 3 / 4 },
] as const;

/** A small preview of the cropped result (display only — the server does the real crop). */
export async function cropPreview(src: string, c: CropSpec, max = 480): Promise<string> {
  const img = await new Promise<HTMLImageElement>((ok, fail) => {
    const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src;
  });
  const turned = c.rotate % 180 !== 0;
  const W = turned ? img.naturalHeight : img.naturalWidth;
  const H = turned ? img.naturalWidth : img.naturalHeight;
  const sw = c.w * W, sh = c.h * H;
  const scale = Math.min(1, max / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.translate(-c.x * W, -c.y * H);
  ctx.translate(W / 2, H / 2);
  ctx.rotate((c.rotate * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function CropDialog({ src, fileName, initial, onApply, onSkip, onClose, defaultShape = 'original', skipLabel }: {
  src: string;
  fileName?: string;
  initial?: CropSpec | null;
  onApply: (crop: CropSpec | null) => void;
  /** Shown as a secondary action ("Upload without cropping"). */
  onSkip?: () => void;
  onClose: () => void;
  defaultShape?: (typeof SHAPES)[number]['key'];
  skipLabel?: string;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(initial?.rotate || 0);
  const [shape, setShape] = useState<string>(defaultShape);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [area, setArea] = useState<Area | null>(null);

  const turned = rotation % 180 !== 0;
  const upright = natural ? (turned ? { w: natural.h, h: natural.w } : natural) : null;
  const aspect = useMemo(() => {
    const s = SHAPES.find((x) => x.key === shape);
    if (s && 'ratio' in s) return s.ratio;
    return upright ? upright.w / upright.h : 4 / 3;
  }, [shape, upright]);

  useEffect(() => { setCrop({ x: 0, y: 0 }); setZoom(1); }, [shape, rotation]);
  const onComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const result = (): CropSpec | null => {
    if (!area || !upright) return null;
    const c = {
      x: Math.max(0, area.x / upright.w), y: Math.max(0, area.y / upright.h),
      w: Math.min(1, area.width / upright.w), h: Math.min(1, area.height / upright.h), rotate: rotation % 360,
    };
    if (c.rotate === 0 && c.w > 0.995 && c.h > 0.995) return null; // whole photo
    return c;
  };
  const outPx = area ? `${Math.round(area.width)} × ${Math.round(area.height)} px` : '';
  const small = area && area.width < 1280;

  return (
    <Dialog title={fileName ? `Crop ${fileName}` : 'Crop photo'} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="relative h-[55dvh] min-h-64 overflow-hidden rounded-lg bg-stone-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
            onMediaLoaded={(m) => setNatural({ w: m.naturalWidth, h: m.naturalHeight })}
            objectFit="contain"
            showGrid
            zoomWithScroll
          />
        </div>

        <fieldset>
          <legend className="field-label">Shape</legend>
          <div className="flex flex-wrap gap-2">
            {SHAPES.map((s) => (
              <button key={s.key} type="button" onClick={() => setShape(s.key)} aria-pressed={shape === s.key}
                className={`chip ${shape === s.key ? 'chip-active' : ''}`}>{s.label}</button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex min-w-[220px] flex-1 items-center gap-3 text-sm text-stone-700">
            Zoom
            <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-stone-900" aria-label="Zoom" />
          </label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
            <RotateCw className="h-4 w-4" aria-hidden />Rotate
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRotation(0); setShape('original'); setZoom(1); setCrop({ x: 0, y: 0 }); }}>
            <Undo2 className="h-4 w-4" aria-hidden />Reset
          </button>
        </div>

        <p className={`text-xs ${small ? 'text-amber-800' : 'text-stone-500'}`}>
          Result: {outPx || '—'}.{small ? ' Below 1280 px wide it may look soft on large screens; zoom out a little.' : ''}{' '}
          The original photo is always kept, so a crop can be redone later.
        </p>

        <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-4">
          {onSkip && <button type="button" className="btn btn-ghost" onClick={onSkip}>{skipLabel || 'Use whole photo'}</button>}
          <button type="button" className="btn btn-primary" onClick={() => onApply(result())} disabled={!area}>Apply crop</button>
        </div>
      </div>
    </Dialog>
  );
}
