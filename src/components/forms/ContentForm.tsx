import { useMemo, useState, type KeyboardEvent } from 'react';
import countryData from '../../data/country-codes.json' with { type: 'json' };
import type { Fields, MessageMap, QrType } from '../../lib/payloads/types';
import { hasKey, getUiDict } from '../../lib/i18n';
import { FormField } from '../common/FormField';
import { Segmented } from '../common/Segmented';
import { useI18n } from '../common/i18n';
import { formSchemas, type FieldDef } from './fields';

interface Props {
  type: QrType;
  fields: Fields;
  errors: MessageMap;
  warnings: MessageMap;
  /** Field names whose errors may be shown. */
  visible: (name: string) => boolean;
  onChange: (name: string, value: string | boolean, extra?: Fields) => void;
  onBlur: (name: string) => void;
  /** Enter in a single-line field jumps to the download button. */
  onEnter: () => void;
}

function useCountries(locale: string) {
  return useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
      names = null;
    }
    return (countryData.countries as Array<[string, string]>)
      .map(([iso, code]) => ({ iso, code, name: names?.of(iso) ?? iso }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);
}

function useTimeZones(): string[] {
  return useMemo(() => {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    const zones = intl.supportedValuesOf?.('timeZone') ?? ['UTC', 'Asia/Kolkata'];
    return zones.includes('UTC') ? zones : ['UTC', ...zones];
  }, []);
}

export function ContentForm({
  type,
  fields,
  errors,
  warnings,
  visible,
  onChange,
  onBlur,
  onEnter,
}: Props) {
  const { t, locale } = useI18n();
  const dict = getUiDict(locale);
  const countries = useCountries(locale);
  const zones = useTimeZones();
  const [showPassword, setShowPassword] = useState(false);
  const schema = formSchemas[type].filter((f) => !f.showIf || f.showIf(fields));

  const text = (prefix: string, name: string) => {
    const key = `${prefix}.${type}.${name}`;
    return hasKey(dict, key) || hasKey(getUiDict('en'), key) ? t(key) : undefined;
  };
  const enter = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    }
  };

  const render = (def: FieldDef) => {
    const name = def.name;
    const label = t(`field.${type}.${name}`);
    const value = fields[name];
    const str = typeof value === 'string' ? value : '';
    const error = errors[name] && visible(name) ? t(errors[name]!) : undefined;
    const warning = warnings[name] ? t(warnings[name]!) : undefined;
    const hint = text('hint', name);
    const placeholder = text('placeholder', name);
    const optional =
      !def.required &&
      !['checkbox', 'select', 'segmented', 'countryCode', 'timezone'].includes(def.kind);
    const change = (v: string | boolean) => onChange(name, v, def.onChange?.(v, fields));
    const wrapClass = def.half ? 'sm:col-span-1' : 'sm:col-span-2';

    if (def.kind === 'checkbox') {
      return (
        <div key={`${def.kind}-${name}`} className={`${wrapClass} flex min-h-11 items-center`}>
          <label className="flex cursor-pointer items-center gap-3 font-medium">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--accent)]"
              checked={value === true}
              onChange={(e) => change(e.target.checked)}
            />
            {label}
          </label>
        </div>
      );
    }
    if (def.kind === 'segmented') {
      return (
        <div key={`${def.kind}-${name}`} className={wrapClass}>
          <Segmented
            label={label}
            value={str}
            hint={hint}
            options={(def.options ?? []).map((o) => ({
              value: o.value,
              label: o.literal ? o.label : t(o.label),
            }))}
            onChange={(v) => change(v)}
          />
        </div>
      );
    }

    return (
      <FormField
        key={`${def.kind}-${name}`}
        className={wrapClass}
        label={label}
        hint={hint}
        error={error}
        warning={warning}
        optionalText={optional ? t('generator.optional') : undefined}
      >
        {({ id, describedBy, invalid }) => {
          const common = {
            id,
            name,
            'aria-describedby': describedBy,
            'aria-invalid': invalid || undefined,
            'aria-required': def.required || undefined,
            onBlur: () => onBlur(name),
          };
          switch (def.kind) {
            case 'textarea':
              return (
                <textarea
                  {...common}
                  className="input"
                  rows={def.rows ?? 3}
                  value={str}
                  placeholder={placeholder}
                  maxLength={def.maxLength}
                  onChange={(e) => change(e.target.value)}
                />
              );
            case 'select':
              return (
                <select
                  {...common}
                  className="input"
                  value={str}
                  onChange={(e) => change(e.target.value)}
                >
                  {(def.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.literal ? o.label : t(o.label)}
                    </option>
                  ))}
                </select>
              );
            case 'countryCode':
              return (
                <select
                  {...common}
                  className="input"
                  value={str}
                  onChange={(e) => change(e.target.value)}
                  autoComplete="tel-country-code"
                >
                  {countries.map((c) => (
                    <option key={c.iso} value={c.code}>
                      {c.name} (+{c.code})
                    </option>
                  ))}
                </select>
              );
            case 'timezone':
              return (
                <select
                  {...common}
                  className="input"
                  value={str}
                  onChange={(e) => change(e.target.value)}
                >
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              );
            case 'password':
              return (
                <div className="flex gap-2">
                  <input
                    {...common}
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={str}
                    autoComplete={def.autoComplete ?? 'off'}
                    spellCheck={false}
                    onKeyDown={enter}
                    onChange={(e) => change(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary shrink-0"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? t('generator.hidePassword') : t('generator.showPassword')}
                  </button>
                </div>
              );
            default: {
              const inputType =
                def.kind === 'datetime'
                  ? 'datetime-local'
                  : def.kind === 'date'
                    ? 'date'
                    : def.kind === 'email'
                      ? 'email'
                      : def.kind === 'tel'
                        ? 'tel'
                        : def.kind === 'url'
                          ? 'url'
                          : 'text';
              return (
                <input
                  {...common}
                  className="input"
                  type={inputType}
                  inputMode={def.kind === 'decimal' ? 'decimal' : undefined}
                  value={str}
                  placeholder={placeholder}
                  maxLength={def.maxLength}
                  autoComplete={def.autoComplete}
                  spellCheck={def.kind === 'text' ? undefined : false}
                  autoCapitalize={['url', 'email'].includes(def.kind) ? 'none' : undefined}
                  onKeyDown={enter}
                  onChange={(e) => change(e.target.value)}
                />
              );
            }
          }
        }}
      </FormField>
    );
  };

  return <div className="grid gap-4 sm:grid-cols-2">{schema.map(render)}</div>;
}
