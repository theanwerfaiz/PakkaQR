import type { ReactNode } from 'react';
import type { Panel } from '../../data/pages';
import {
  cornerDotStyles,
  cornerSquareStyles,
  dotStyles,
  ecLevels,
  MARGIN_MAX,
  resolveEcLevel,
  type EcSetting,
  type QrDesign,
} from '../../lib/render/design';
import { applyPreset } from '../../lib/render/presets';
import { ColorField } from '../common/ColorField';
import { FormField } from '../common/FormField';
import { Segmented } from '../common/Segmented';
import { Slider } from '../common/Slider';
import { useT } from '../common/i18n';
import { FramePicker } from './FramePicker';
import { LogoPicker } from './LogoPicker';
import { PresetGrid } from './PresetGrid';
import { QuickStyle } from './QuickStyle';

interface Props {
  design: QrDesign;
  onChange: (design: QrDesign) => void;
  onReset: () => void;
  defaultFrameLabel: string;
  openPanel?: Panel | undefined;
  /** Extra section (saved designs & history). */
  children?: ReactNode;
}

function Section({
  id,
  title,
  open,
  children,
}: {
  id: string;
  title: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group border-b border-border last:border-b-0" open={open} data-panel={id}>
      <summary className="flex min-h-14 items-center justify-between gap-2 px-5 py-3 text-[1.1rem] font-semibold">
        {title}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="px-5 pb-6">{children}</div>
    </details>
  );
}

export function CustomizePanel({
  design,
  onChange,
  onReset,
  defaultFrameLabel,
  openPanel,
  children,
}: Props) {
  const t = useT();
  const set = (patch: Partial<QrDesign>) => onChange({ ...design, ...patch });
  const gradient = design.gradient;

  return (
    <section aria-labelledby="customize-heading" className="flex flex-col gap-6" id="style">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">{t('generator.customizeKicker')}</p>
          <h2 id="customize-heading" className="mt-1">
            {t('generator.customize')}
          </h2>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
          {t('design.reset')}
        </button>
      </div>
      <QuickStyle design={design} onChange={onChange} />
      <div className="overflow-hidden rounded-[20px] bg-soft/45">
        <Section
          id="presets"
          title={t('design.presets')}
          open={openPanel === 'presets' || openPanel === undefined}
        >
          <PresetGrid design={design} onApply={(p) => onChange(applyPreset(design, p))} />
        </Section>

        <Section id="colors" title={t('design.colors')} open={openPanel === 'colors'}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {!gradient && (
                <ColorField
                  label={t('design.fg')}
                  value={design.fg}
                  onChange={(fg) => set({ fg })}
                />
              )}
              <ColorField label={t('design.bg')} value={design.bg} onChange={(bg) => set({ bg })} />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={design.transparentBg}
                onChange={(e) => set({ transparentBg: e.target.checked })}
                aria-describedby="transparent-hint"
              />
              {t('design.transparent')}
            </label>
            <p id="transparent-hint" className="hint -mt-3">
              {t('design.transparentHint')}
            </p>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={!!gradient}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? {
                          ...design,
                          gradient: { kind: 'linear', colors: [design.fg, '#7A2412'], angle: 45 },
                        }
                      : { ...design, gradient: undefined, fg: gradient?.colors[0] ?? design.fg },
                  )
                }
              />
              {t('design.gradient')}
            </label>
            {gradient && (
              <div className="space-y-4 rounded-[10px] bg-surface-2 p-3">
                <Segmented
                  label={t('design.gradientKind')}
                  value={gradient.kind}
                  options={[
                    { value: 'linear', label: t('design.linear') },
                    { value: 'radial', label: t('design.radial') },
                  ]}
                  onChange={(kind) => set({ gradient: { ...gradient, kind } })}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField
                    label={t('design.gradientStart')}
                    value={gradient.colors[0]}
                    onChange={(c) =>
                      set({ fg: c, gradient: { ...gradient, colors: [c, gradient.colors[1]] } })
                    }
                  />
                  <ColorField
                    label={t('design.gradientEnd')}
                    value={gradient.colors[1]}
                    onChange={(c) =>
                      set({ gradient: { ...gradient, colors: [gradient.colors[0], c] } })
                    }
                  />
                </div>
                {gradient.kind === 'linear' && (
                  <Slider
                    label={t('design.angle')}
                    min={0}
                    max={360}
                    step={15}
                    value={gradient.angle}
                    display={`${gradient.angle}°`}
                    onChange={(angle) => set({ gradient: { ...gradient, angle } })}
                  />
                )}
              </div>
            )}
          </div>
        </Section>

        <Section id="shape" title={t('design.shape')} open={openPanel === 'shape'}>
          <div className="space-y-4">
            <Segmented
              label={t('design.dotStyle')}
              value={design.dotStyle}
              options={dotStyles.map((v) => ({ value: v, label: t(`dotStyle.${v}`) }))}
              onChange={(dotStyle) => set({ dotStyle })}
            />
            <Segmented
              label={t('design.cornerSquare')}
              value={design.cornerSquareStyle}
              options={cornerSquareStyles.map((v) => ({ value: v, label: t(`cornerSquare.${v}`) }))}
              onChange={(cornerSquareStyle) => set({ cornerSquareStyle })}
            />
            <Segmented
              label={t('design.cornerDot')}
              value={design.cornerDotStyle}
              options={cornerDotStyles.map((v) => ({ value: v, label: t(`cornerDot.${v}`) }))}
              onChange={(cornerDotStyle) => set({ cornerDotStyle })}
            />
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={!!design.cornerColor}
                onChange={(e) => set({ cornerColor: e.target.checked ? '#7A2412' : undefined })}
              />
              {t('design.cornerColor')}
            </label>
            {design.cornerColor && (
              <ColorField
                label={t('design.cornerColorValue')}
                value={design.cornerColor}
                onChange={(cornerColor) => set({ cornerColor })}
              />
            )}
          </div>
        </Section>

        <Section id="logo" title={t('design.logo')} open={openPanel === 'logo'}>
          <LogoPicker design={design} onChange={onChange} />
        </Section>

        <Section id="frame" title={t('design.frame')} open={openPanel === 'frame'}>
          <FramePicker design={design} onChange={onChange} defaultLabel={defaultFrameLabel} />
        </Section>

        <Section id="advanced" title={t('design.advanced')} open={openPanel === 'advanced'}>
          <div className="space-y-4">
            <Slider
              label={t('design.margin')}
              min={0}
              max={MARGIN_MAX}
              value={design.margin}
              display={t('design.modules', { count: design.margin })}
              hint={t('design.marginHint')}
              onChange={(margin) => set({ margin })}
            />
            <FormField
              label={t('design.ecLevel')}
              hint={
                design.ecLevel === 'auto'
                  ? `${t('design.ecHint')} ${t('ec.autoNow', { level: t(`ec.${resolveEcLevel(design)}`) })}`
                  : t('design.ecHint')
              }
            >
              {({ id, describedBy }) => (
                <select
                  id={id}
                  aria-describedby={describedBy}
                  className="input"
                  value={design.ecLevel}
                  onChange={(e) => set({ ecLevel: e.target.value as EcSetting })}
                >
                  {ecLevels.map((level) => (
                    <option key={level} value={level}>
                      {t(`ec.${level}`)}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>
        </Section>

        {children}
      </div>
    </section>
  );
}

export { Section };
