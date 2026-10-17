import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Panel } from '../../data/pages';
import type { Locale } from '../../lib/i18n';
import { encodeContent, type Fields, type QrContent, type QrType } from '../../lib/payloads';
import { canvasMeasurer } from '../../lib/render/canvas';
import { defaultDesign, type QrDesign } from '../../lib/render/design';
import { buildGeometry, type Geometry } from '../../lib/render/geometry';
import { PayloadTooLongError } from '../../lib/render/matrix';
import { designFromHash } from '../../lib/render/share';
import {
  applyFix,
  checkDesign,
  decodeIssue,
  overallStatus,
  type FixId,
  type Issue,
} from '../../lib/scannability/checks';
import { runScanTest } from '../../lib/scannability/scan-test';
import {
  canCopyImage,
  canShareFiles,
  cleanFileName,
  copyImage,
  defaultFileName,
  downloadBlob,
  exportRaster,
  exportSvg,
  shareImage,
  withExtension,
} from '../../lib/export';
import { loadLastDesign, recordHistory, saveLastDesign } from '../../lib/storage';
import { readSession, writeSession } from '../../lib/storage/local';
import { siteConfig } from '../../lib/site';
import { Modal } from '../common/Modal';
import { ToastProvider, useToast } from '../common/Toast';
import { I18nProvider, useI18n } from '../common/i18n';
import { ContentForm } from '../forms/ContentForm';
import { CustomizePanel } from './CustomizePanel';
import { ExportPanel, type ExportRequest } from './ExportPanel';
import { Preview } from './Preview';
import { SavedPanel } from './SavedPanel';
import { ScanStatus } from './ScanStatus';
import { TypeTabs } from './TypeTabs';
import {
  browserCanvas,
  isTyping,
  measureContext,
  useDebounced,
  useFontsReady,
  useImage,
} from './hooks';
import { initialState, reducer, summarize } from './state';

export interface GeneratorProps {
  locale: Locale;
  initialType: QrType;
  initialFields?: Fields;
  /** Use-case pages start with a frame (label already translated). */
  frame?: { id: string; label: string };
  openPanel?: Panel;
}

export default function Generator(props: GeneratorProps) {
  return (
    <I18nProvider locale={props.locale}>
      <ToastProvider>
        <GeneratorApp {...props} />
      </ToastProvider>
    </I18nProvider>
  );
}

const SUPPORT_TOAST_KEY = 'pakkaqr:support-toast';
const ALL_FIXES_ORDER: FixId[] = [
  'darkerColors',
  'swapColors',
  'increaseMargin',
  'raiseEc',
  'shrinkLogo',
];

function GeneratorApp({ initialType, initialFields, frame, openPanel }: GeneratorProps) {
  const { t } = useI18n();
  const toast = useToast();
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState(initialType, initialFields),
  );
  const { type, design } = state;
  const fields = state.fields[type];
  const setDesign = useCallback((d: QrDesign) => dispatch({ kind: 'design', design: d }), []);
  const loaded = useRef(false);
  const pngButton = useRef<HTMLButtonElement>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ExportRequest | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [caps, setCaps] = useState({ copy: false, share: false });

  // ------------------------------------------------------------ restore style
  useEffect(() => {
    let d = loadLastDesign() ?? defaultDesign;
    if (frame && !d.frame) {
      d = {
        ...d,
        frame: {
          id: frame.id,
          label: frame.label,
          labelColor: '#FFFFFF',
          frameColor: d.fg === '#FFFFFF' ? '#000000' : d.fg,
        },
      };
    }
    const shared = designFromHash(window.location.hash);
    if (shared) {
      d = d.logo ? { ...shared, logo: d.logo } : shared;
      history.replaceState(null, '', window.location.pathname + window.location.search);
      toast({ text: t('saved.appliedFromLink') });
    }
    setDesign(d);
    setCaps({ copy: canCopyImage(), share: canShareFiles() });
    loaded.current = true;
    // Runs once on mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => saveLastDesign(design), 400);
    return () => clearTimeout(timer);
  }, [design]);

  // The frame label follows the type's default until the user edits it.
  const defaultLabel = t(`frame.defaultLabel.${type}`);
  const previousDefault = useRef(defaultLabel);
  useEffect(() => {
    if (
      design.frame &&
      design.frame.label === previousDefault.current &&
      defaultLabel !== previousDefault.current
    ) {
      setDesign({ ...design, frame: { ...design.frame, label: defaultLabel } });
    }
    previousDefault.current = defaultLabel;
    // Only reacts to the type changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLabel]);

  // ------------------------------------------------------------ encode & render
  const encoded = useMemo(() => encodeContent({ type, fields }), [type, fields]);
  const payload = encoded.ok ? encoded.payload : null;
  const debounced = useDebounced(payload, 150);
  const livePayload = payload === null ? null : debounced;
  const fontsReady = useFontsReady();
  const logoImage = useImage(design.logo?.dataUrl);

  const build = useCallback(
    (p: string, d: QrDesign): Geometry => {
      const measure =
        typeof document !== 'undefined' ? canvasMeasurer(measureContext()) : undefined;
      return buildGeometry(p, d, measure ? { measure } : {});
    },
    // fontsReady: re-measure labels once fonts load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fontsReady],
  );

  const built = useMemo((): { geometry: Geometry | null; error: string | null } => {
    if (!livePayload) return { geometry: null, error: null };
    try {
      return { geometry: build(livePayload, design), error: null };
    } catch (e) {
      return {
        geometry: null,
        error: e instanceof PayloadTooLongError ? 'errors.tooLong' : 'errors.export',
      };
    }
  }, [livePayload, design, build]);
  const geometry = built.geometry;

  // ------------------------------------------------------------ scan check
  const [scan, setScan] = useState<{ geometry: Geometry; ok: boolean } | null>(null);
  useEffect(() => {
    if (!geometry || !livePayload) return;
    if (design.logo && !logoImage) return; // wait for the logo to decode
    let live = true;
    const timer = setTimeout(() => {
      void runScanTest(geometry, livePayload, browserCanvas, logoImage ?? undefined).then((r) => {
        if (live) setScan({ geometry, ok: r.ok });
      });
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [geometry, livePayload, logoImage, design.logo]);

  const staticIssues = useMemo(
    () => (geometry ? checkDesign(design, geometry) : []),
    [design, geometry],
  );
  const fresh = !!geometry && scan?.geometry === geometry;
  const issues: Issue[] = fresh ? [...staticIssues, ...decodeIssue(scan.ok)] : staticIssues;
  const status = !geometry ? 'idle' : fresh ? overallStatus(issues) : 'checking';

  // ------------------------------------------------------------ export
  const defaultName = defaultFileName(type);
  const baseName = cleanFileName(fileName, defaultName);

  const afterExport = async (content: QrContent, p: string) => {
    if ((await recordHistory(content, p).catch(() => null)) !== null)
      setHistoryVersion((v) => v + 1);
    if (!readSession(SUPPORT_TOAST_KEY)) {
      writeSession(SUPPORT_TOAST_KEY, '1');
      toast({
        text: `${t('toast.saved')} ${t('toast.support')}`,
        tone: 'success',
        duration: 9000,
        action: (
          <>
            <a
              className="btn btn-secondary btn-sm"
              href={siteConfig.githubUrl}
              target="_blank"
              rel="noopener"
            >
              {t('toast.star')}
            </a>
            {siteConfig.sponsorUrl && (
              <a
                className="btn btn-secondary btn-sm"
                href={siteConfig.sponsorUrl}
                target="_blank"
                rel="noopener"
              >
                {t('toast.coffee')}
              </a>
            )}
          </>
        ),
      });
    } else {
      toast({ text: t('toast.saved'), tone: 'success' });
    }
  };

  const runExport = async (request: ExportRequest, force = false) => {
    if (!payload) {
      dispatch({ kind: 'reveal' });
      document.querySelector<HTMLElement>('#generator-form [aria-invalid="true"]')?.focus();
      return;
    }
    let g: Geometry;
    try {
      g = build(payload, design);
    } catch {
      return;
    }
    if (!force) {
      const ok =
        scan?.geometry === geometry && payload === livePayload
          ? scan.ok
          : (await runScanTest(g, payload, browserCanvas, logoImage ?? undefined)).ok;
      if (overallStatus([...checkDesign(design, g), ...decodeIssue(ok)]) === 'fail') {
        setPending(request);
        return;
      }
    }
    setBusy(true);
    try {
      const logo = logoImage ?? undefined;
      const raster = (format: 'png' | 'jpeg' | 'webp', size: number) =>
        exportRaster(
          g,
          format,
          size,
          logo
            ? { logo, bg: design.bg, transparent: design.transparentBg }
            : { bg: design.bg, transparent: design.transparentBg },
        );
      const title = t('generator.alt', {
        type: t(`type.${type}`),
        summary: summarize(type, fields),
      });
      switch (request.action) {
        case 'png':
        case 'jpeg':
        case 'webp':
          downloadBlob(
            await raster(request.action, request.size),
            withExtension(baseName, request.action),
          );
          break;
        case 'svg':
          downloadBlob(exportSvg(g, title, request.size), withExtension(baseName, 'svg'));
          break;
        case 'pdf': {
          const { exportPdf } = await import('../../lib/export/pdf');
          downloadBlob(
            await exportPdf(g, { widthMm: request.pdfWidthCm * 10, title }),
            withExtension(baseName, 'pdf'),
          );
          break;
        }
        case 'copy':
          await copyImage(await raster('png', 1024));
          toast({ text: t('export.copied'), tone: 'success' });
          break;
        case 'share':
          await shareImage(await raster('png', request.size), withExtension(baseName, 'png'));
          break;
      }
      if (request.action !== 'copy' && request.action !== 'share')
        await afterExport({ type, fields }, payload);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        toast({
          text: t(request.action === 'copy' ? 'errors.clipboard' : 'errors.export'),
          tone: 'error',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const fixAll = () => {
    let d = design;
    const ids = new Set(issues.map((i) => i.fix).filter(Boolean));
    for (const fix of ALL_FIXES_ORDER) if (ids.has(fix)) d = applyFix(d, fix);
    if (issues.some((i) => i.id === 'decode') && d.ecLevel !== 'H') d = applyFix(d, 'raiseEc');
    setDesign(d);
  };

  // ------------------------------------------------------------ shortcuts
  const exportRef = useRef(runExport);
  exportRef.current = runExport;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void exportRef.current({ action: e.shiftKey ? 'svg' : 'png', size: 1024, pdfWidthCm: 5 });
      } else if (e.key === '?' && !isTyping(e.target)) {
        setHelpOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ------------------------------------------------------------ view
  const errors = encoded.ok ? {} : encoded.errors;
  const visible = (name: string) => state.revealErrors || !!state.touched[name];
  const hasVisibleErrors = Object.keys(errors).some(visible);
  const summary = summarize(type, fields);
  const alt = design.frame?.label
    ? t('generator.altFramed', { type: t(`type.${type}`), summary, label: design.frame.label })
    : t('generator.alt', { type: t(`type.${type}`), summary });
  const previewMessage = built.error
    ? t(built.error)
    : hasVisibleErrors
      ? t('generator.fixErrors')
      : undefined;

  return (
    <div
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start"
      data-testid="generator"
    >
      <div className="space-y-4 lg:col-start-1">
        <TypeTabs value={type} onChange={(next) => dispatch({ kind: 'type', type: next })} />
        <section id="generator-form" aria-labelledby="details-heading" className="card p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="details-heading" className="text-lg font-bold">
              {t('generator.details')}
            </h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => dispatch({ kind: 'example' })}
              data-testid="try-example"
            >
              {t('action.example')}
            </button>
          </div>
          <form onSubmit={(e) => e.preventDefault()} noValidate>
            <ContentForm
              type={type}
              fields={fields}
              errors={errors}
              warnings={encoded.warnings}
              visible={visible}
              onChange={(name, value, extra) =>
                dispatch(
                  extra ? { kind: 'field', name, value, extra } : { kind: 'field', name, value },
                )
              }
              onBlur={(name) => dispatch({ kind: 'touch', name })}
              onEnter={() => pngButton.current?.focus()}
            />
          </form>
          {type === 'upi' && (
            <p className="mt-4 rounded-[10px] bg-surface-2 p-3 text-sm">{t('upi.check')}</p>
          )}
          {payload && (
            <p className="mt-4 text-sm text-muted" data-testid="payload-length">
              {t('generator.length', { count: payload.length })}
            </p>
          )}
          {encoded.ok && encoded.dense && (
            <p className="warning-text">
              {t('generator.dense', {
                tip: t(type === 'url' ? 'generator.denseTipUrl' : 'generator.denseTipOther'),
              })}
            </p>
          )}
        </section>
      </div>

      <aside
        aria-labelledby="preview-heading"
        className="lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1"
      >
        <div className="card space-y-4 p-4 sm:p-5">
          <h2 id="preview-heading" className="visually-hidden">
            {t('generator.previewHeading')}
          </h2>
          <Preview
            geometry={geometry}
            logo={logoImage}
            alt={alt}
            transparent={design.transparentBg}
            message={previewMessage}
          />
          <ScanStatus
            status={status}
            issues={issues}
            onFix={(fix) => setDesign(applyFix(design, fix))}
          />
          <ExportPanel
            ref={pngButton}
            disabled={!geometry}
            busy={busy}
            fileName={fileName}
            defaultName={defaultName}
            onFileName={setFileName}
            onExport={(r) => void runExport(r)}
            canCopy={caps.copy}
            canShare={caps.share}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm w-full"
            onClick={() => setHelpOpen(true)}
          >
            {t('shortcuts.open')}
          </button>
        </div>
      </aside>

      <div className="lg:col-start-1">
        <CustomizePanel
          design={design}
          onChange={setDesign}
          onReset={() => setDesign(defaultDesign)}
          defaultFrameLabel={defaultLabel}
          openPanel={openPanel}
        >
          <SavedPanel
            design={design}
            content={{ type, fields }}
            onApplyDesign={setDesign}
            onApplyContent={(content) => dispatch({ kind: 'content', content })}
            historyVersion={historyVersion}
          />
        </CustomizePanel>
      </div>

      {/* Mobile: sticky download bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <span className="flex-1 truncate text-sm" aria-hidden="true">
            {status === 'great' ? '✅' : status === 'risky' ? '⚠️' : status === 'fail' ? '❌' : ''}{' '}
            {t(`type.${type}`)}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!geometry || busy}
            onClick={() => void runExport({ action: 'png', size: 1024, pdfWidthCm: 5 })}
          >
            {t('action.download')}
          </button>
        </div>
      </div>

      <Modal
        open={pending !== null}
        title={t('modal.notScannable.title')}
        onClose={() => setPending(null)}
      >
        <p>{t('modal.notScannable.body')}</p>
        {issues.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm text-muted">
            {issues.map((i) => (
              <li key={i.id}>{t(i.reason, i.vars)}</li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
            {t('modal.notScannable.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const r = pending;
              setPending(null);
              if (r) void runExport(r, true);
            }}
          >
            {t('modal.notScannable.anyway')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setPending(null);
              fixAll();
            }}
          >
            {t('modal.notScannable.fix')}
          </button>
        </div>
      </Modal>

      <Modal open={helpOpen} title={t('shortcuts.title')} onClose={() => setHelpOpen(false)}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt>
            <kbd className="rounded border border-border px-1.5 font-mono">Ctrl/⌘ + S</kbd>
          </dt>
          <dd>{t('shortcuts.png')}</dd>
          <dt>
            <kbd className="rounded border border-border px-1.5 font-mono">Ctrl/⌘ + Shift + S</kbd>
          </dt>
          <dd>{t('shortcuts.svg')}</dd>
          <dt>
            <kbd className="rounded border border-border px-1.5 font-mono">Enter</kbd>
          </dt>
          <dd>{t('shortcuts.enter')}</dd>
          <dt>
            <kbd className="rounded border border-border px-1.5 font-mono">?</kbd>
          </dt>
          <dd>{t('shortcuts.help')}</dd>
        </dl>
      </Modal>
    </div>
  );
}
