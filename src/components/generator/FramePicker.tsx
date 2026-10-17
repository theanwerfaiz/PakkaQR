import { frameIds } from '../../lib/render/geometry';
import type { QrDesign } from '../../lib/render/design';
import { ColorField } from '../common/ColorField';
import { FormField } from '../common/FormField';
import { useT } from '../common/i18n';

interface Props {
  design: QrDesign;
  defaultLabel: string;
  onChange: (design: QrDesign) => void;
}

const ICONS: Record<string, string> = {
  none: 'M5 5h14v14H5z',
  'box-bottom': 'M4 3h16v18H4zM4 16h16',
  'rounded-bottom':
    'M7 3h10a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM4 16h16',
  'banner-top': 'M4 3h16v18H4zM4 8h16',
  'speech-bubble': 'M4 3h16v12H4zM9 18h6M12 15v2M5 18h14v3H5z',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM10 4h4',
};

export function FramePicker({ design, defaultLabel, onChange }: Props) {
  const t = useT();
  const frame = design.frame;
  const current = frame?.id ?? 'none';
  const select = (id: string) => {
    if (id === 'none') return onChange({ ...design, frame: undefined });
    onChange({
      ...design,
      frame: {
        id,
        label: frame?.label ?? defaultLabel,
        labelColor: frame?.labelColor ?? '#FFFFFF',
        frameColor:
          frame?.frameColor ??
          (design.gradient
            ? design.gradient.colors[0]
            : design.fg === '#FFFFFF'
              ? '#000000'
              : design.fg),
      },
    });
  };
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">{t('frame.style')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {frameIds.map((id) => (
            <label
              key={id}
              className={`flex min-h-11 cursor-pointer flex-col items-center gap-1 rounded-[10px] border-2 p-2 text-center text-xs font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--focus)] ${
                current === id ? 'border-accent bg-surface-2' : 'border-border hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name="frame-style"
                value={id}
                checked={current === id}
                onChange={() => select(id)}
                className="visually-hidden"
              />
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              >
                <path d={ICONS[id]} />
              </svg>
              {t(`frame.${id}`)}
            </label>
          ))}
        </div>
      </fieldset>
      {frame && (
        <>
          <FormField label={t('frame.label')}>
            {({ id }) => (
              <input
                id={id}
                className="input"
                value={frame.label}
                maxLength={40}
                onChange={(e) =>
                  onChange({ ...design, frame: { ...frame, label: e.target.value } })
                }
              />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label={t('frame.frameColor')}
              value={frame.frameColor}
              onChange={(v) => onChange({ ...design, frame: { ...frame, frameColor: v } })}
            />
            <ColorField
              label={t('frame.labelColor')}
              value={frame.labelColor}
              onChange={(v) => onChange({ ...design, frame: { ...frame, labelColor: v } })}
            />
          </div>
        </>
      )}
    </div>
  );
}
