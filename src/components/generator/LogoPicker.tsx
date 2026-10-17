import { useState } from 'react';
import { LOGO_MAX_RATIO, LOGO_MIN_RATIO, type QrDesign } from '../../lib/render/design';
import { processLogo, svgIconToLogo, type ProcessedLogo } from '../../lib/render/logo';
import { Dropzone } from '../common/Dropzone';
import { Slider } from '../common/Slider';
import { useT } from '../common/i18n';
import { logoIcons } from './logoIcons';

interface Props {
  design: QrDesign;
  onChange: (design: QrDesign) => void;
}

export function LogoPicker({ design, onChange }: Props) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const logo = design.logo;

  const setLogo = (processed: ProcessedLogo) => {
    setError(null);
    onChange({
      ...design,
      logo: {
        dataUrl: processed.dataUrl,
        aspect: processed.aspect,
        sizeRatio: logo?.sizeRatio ?? 0.22,
        margin: logo?.margin ?? 1,
        hideBackgroundDots: logo?.hideBackgroundDots ?? true,
      },
    });
  };
  const upload = async (file: File) => {
    try {
      setLogo(await processLogo(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'errors.image.unreadable');
    }
  };

  return (
    <div className="space-y-4">
      <Dropzone
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        label={t('logo.upload')}
        onFile={(f) => void upload(f)}
      >
        <p className="hint">{t('logo.drop')}</p>
      </Dropzone>
      {error && (
        <p className="error-text" role="alert">
          {t(error)}
        </p>
      )}
      <div>
        <p className="label">{t('logo.builtIn')}</p>
        <ul className="flex flex-wrap gap-2">
          {logoIcons.map((icon) => (
            <li key={icon.id}>
              <button
                type="button"
                className="btn btn-secondary h-12 w-12 p-1"
                aria-label={t(`logo.icon.${icon.id}`)}
                title={t(`logo.icon.${icon.id}`)}
                onClick={() => void svgIconToLogo(icon.svg).then(setLogo)}
              >
                <img
                  src={`data:image/svg+xml,${encodeURIComponent(icon.svg)}`}
                  alt=""
                  width="36"
                  height="36"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {logo && (
        <div className="space-y-4 rounded-[10px] bg-surface-2 p-3">
          <div className="flex items-center gap-3">
            <img
              src={logo.dataUrl}
              alt={t('logo.current')}
              className="h-12 w-12 rounded border border-border bg-white object-contain"
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onChange({ ...design, logo: undefined })}
            >
              {t('logo.remove')}
            </button>
          </div>
          <Slider
            label={t('logo.size')}
            min={LOGO_MIN_RATIO * 100}
            max={LOGO_MAX_RATIO * 100}
            value={Math.round(logo.sizeRatio * 100)}
            display={`${Math.round(logo.sizeRatio * 100)}%`}
            onChange={(v) => onChange({ ...design, logo: { ...logo, sizeRatio: v / 100 } })}
          />
          <Slider
            label={t('logo.margin')}
            min={0}
            max={3}
            step={0.5}
            value={logo.margin}
            display={t('design.modules', { count: logo.margin })}
            onChange={(v) => onChange({ ...design, logo: { ...logo, margin: v } })}
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--accent)]"
              checked={logo.hideBackgroundDots}
              onChange={(e) =>
                onChange({ ...design, logo: { ...logo, hideBackgroundDots: e.target.checked } })
              }
            />
            {t('logo.hideDots')}
          </label>
        </div>
      )}
    </div>
  );
}
