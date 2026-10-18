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
import { loadLastDesign, recordHistory, sanitizeContent, saveLastDesign } from '../../lib/storage';
import {
  HANDOFF_DESIGN_KEY,
  HANDOFF_KEY,
  readSession,
  takeSession,
  writeSession,
} from '../../lib/storage/local';
import { sanitizeDesign } from '../../lib/render/design';
import { detectInput } from '../../lib/smart/detect';
import { siteConfig } from '../../lib/site';
import { Modal } from '../common/Modal';
import { ToastProvider, useToast } from '../common/Toast';
import { I18nProvider, useI18n } from '../common/i18n';
import { ContentForm } from '../forms/ContentForm';
import { CustomizePanel } from './CustomizePanel';
import { ExportPanel, type ExportRequest } from './ExportPanel';
import { PayloadBox } from './PayloadBox';
import { MockupStage } from './MockupStage';
import { Preview } from './Preview';
import { SavedPanel } from './SavedPanel';
import { ScanMe } from './ScanMe';
import { ScanStatus } from './ScanStatus';
import { ShareStudio } from './ShareStudio';
import { SmartInput } from './SmartInput';
import { SplitBill } from './SplitBill';
import { Stamp, type StampStatus } from './Stamp';
import { Starters } from './Starters';
import { TypeTabs } from './TypeTabs';
import {
  browserCanvas,
  buzz,
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
  /** Home page: the paste-anything box and one-tap starters. */
  hero?: boolean;
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

function GeneratorApp({
  initialType,
  initialFields,
  frame,
  openPanel,
  hero = false,
}: GeneratorProps) {
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
  const [splitOpen, setSplitOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [scanMe, setScanMe] = useState(false);
  const [spin, setSpin] = useState(0);

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
    const handoffDesign = takeSession(HANDOFF_DESIGN_KEY);
    if (handoffDesign) {
      try {
        const next = sanitizeDesign(JSON.parse(handoffDesign));
        d = d.logo && !next.logo ? { ...next, logo: d.logo } : next;
      } catch {
        // Ignore a malformed hand-off.
      }
    }
    setDesign(d);
    // Shared into PakkaQR from another app (PWA share target): ?url= / ?text= / ?title=.
    const params = new URLSearchParams(window.location.search);
    const sharedText = params.get('url') || params.get('text') || params.get('title');
    if (sharedText) {
      const link = /https?:\/\/\S+/.exec(sharedText)?.[0];
      const detected = detectInput(link ?? sharedText);
      if (detected) dispatch({ kind: 'content', content: detected.content });
      history.replaceState(null, '', window.location.pathname);
    }
    const handoff = takeSession(HANDOFF_KEY);
    if (handoff) {
      try {
        const content = sanitizeContent(JSON.parse(handoff));
        if (content) dispatch({ kind: 'content', content });
      } catch {
        // Ignore a malformed hand-off.
      }
    }
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

  // The stamp only changes when a verdict settles, so typing doesn't make it flicker.
  const [settled, setSettled] = useState<StampStatus | null>(null);
  useEffect(() => {
    if (status === 'idle') setSettled(null);
    else if (status !== 'checking') {
      setSettled((prev) => {
        if ((prev === 'risky' || prev === 'fail') && status === 'great') buzz(18);
        return status;
      });
    }
  }, [status]);

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
      if (request.action !== 'copy' && request.action !== 'share') {
        await afterExport({ type, fields }, payload);
        buzz([12, 60, 12]);
        setScanMe(true);
      }
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

  // Enter in a field jumps to Download. The button may still be disabled for
  // the preview's debounce, so retry briefly until it can take focus.
  const focusDownload = () => {
    let tries = 0;
    const attempt = () => {
      const button = pngButton.current;
      if (button && !button.disabled) button.focus();
      else if (tries++ < 10) setTimeout(attempt, 60);
    };
    attempt();
  };

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

  const focusTypes = () =>
    document
      .querySelector<HTMLElement>('[aria-labelledby="qr-type-heading"] [tabindex="0"]')
      ?.focus();
  const focusForm = () =>
    setTimeout(
      () =>
        document
          .querySelector<HTMLElement>(
            '#generator-form input:not([type=hidden]), #generator-form textarea',
          )
          ?.focus(),
      50,
    );
  const magic = () => {
    setSpin((n) => n + 1);
    buzz([20, 40, 20, 40, 60]);
    toast({ text: t('smart.magic'), tone: 'success' });
  };
  const headline = design.frame?.label || t(`frame.defaultLabel.${type}`);
  const shownStamp: StampStatus | null = settled ?? (status === 'checking' ? 'checking' : null);

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)] overflow-clip rounded-[28px] bg-surface shadow-[var(--shadow-card)] lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]"
      data-testid="generator"
    >
      <div className="flex flex-col gap-7 p-5 sm:p-8 lg:col-start-1">
        {hero && (
          <>
            <SmartInput
              onDetect={(content) => dispatch({ kind: 'content', content })}
              onMagic={magic}
              onChangeType={focusTypes}
            />
            <Starters
              design={design}
              onStart={(content, d, starter) => {
                dispatch({ kind: 'content', content });
                setDesign(d);
                setSplitOpen(!!starter.split);
                focusForm();
              }}
            />
          </>
        )}
        <TypeTabs value={type} onChange={(next) => dispatch({ kind: 'type', type: next })} />
        <section id="generator-form" aria-labelledby="details-heading" className="flex flex-col">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 id="details-heading" className="text-2xl">
              {t('generator.details')}
            </h2>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
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
              onEnter={focusDownload}
            />
          </form>
          {type === 'upi' && (
            <div className="mt-5 flex flex-col gap-4">
              <p className="note text-[0.95rem]">{t('upi.check')}</p>
              <SplitBill
                open={splitOpen}
                onToggle={setSplitOpen}
                onUse={(amount, note) => {
                  dispatch({ kind: 'field', name: 'am', value: amount });
                  dispatch({ kind: 'field', name: 'tn', value: note });
                  dispatch({ kind: 'touch', name: 'am' });
                  toast({ text: t('split.applied', { amount }), tone: 'success' });
                }}
              />
            </div>
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
        className="bg-soft/70 p-5 sm:p-7 lg:col-start-2 lg:row-span-2 lg:row-start-1"
      >
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <h2 id="preview-heading" className="visually-hidden">
            {t('generator.previewHeading')}
          </h2>
          <MockupStage
            caption={headline}
            stamp={
              shownStamp && <Stamp small status={shownStamp} stampKey={shownStamp} spin={spin} />
            }
          >
            <Preview
              geometry={geometry}
              logo={logoImage}
              alt={alt}
              transparent={design.transparentBg}
              message={previewMessage}
            />
          </MockupStage>
          <ScanStatus
            status={status}
            issues={issues}
            onFix={(fix) => setDesign(applyFix(design, fix))}
          />
          <PayloadBox payload={livePayload} />
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
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="btn btn-stamp"
              disabled={!geometry}
              onClick={() => setShareOpen(true)}
              data-testid="open-share"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="6" y="2" width="12" height="20" rx="2.5" />
                <path d="M9.5 9h5v5h-5z" />
              </svg>
              {t('share.open')}
            </button>
            <a className="btn btn-secondary" href="#style">
              {t('generator.goStyle')}
            </a>
          </div>
          {scanMe && (
            <ScanMe
              onWorked={() => {
                setSpin((n) => n + 1);
                buzz([20, 40, 20]);
              }}
              onFix={() => {
                fixAll();
                setScanMe(false);
              }}
              onDismiss={() => setScanMe(false)}
            />
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm self-center"
            onClick={() => setHelpOpen(true)}
          >
            {t('shortcuts.open')}
          </button>
        </div>
      </aside>

      <div className="border-t border-border p-5 sm:p-8 lg:col-start-1">
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
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <span className="flex min-w-0 flex-1 flex-col leading-tight" aria-hidden="true">
            <span className="truncate font-semibold">{t(`type.${type}`)}</span>
            <span className="truncate text-sm text-muted">
              {status === 'idle' ? t('generator.barIdle') : t(`status.short.${status}`)}
            </span>
          </span>
          <a className="btn btn-secondary btn-sm min-h-12" href="#style">
            {t('generator.styleShort')}
          </a>
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

      <ShareStudio
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        geometry={geometry}
        logo={logoImage}
        codeColor={design.gradient ? design.gradient.colors[0] : design.fg}
        transparent={design.transparentBg}
        bg={design.bg}
        defaultHeadline={headline}
        defaultSubline={summary}
        fileBase={baseName}
      />

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
