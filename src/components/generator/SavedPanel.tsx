import { useEffect, useState } from 'react';
import type { QrContent } from '../../lib/payloads/types';
import type { QrDesign } from '../../lib/render/design';
import { designToHash } from '../../lib/render/share';
import { downloadBlob } from '../../lib/export';
import {
  addTemplate,
  clearHistory,
  deleteTemplate,
  isHistoryEnabled,
  listHistory,
  listTemplates,
  newId,
  saveTemplates,
  setHistoryEnabled,
  templatesFromJson,
  templatesToJson,
  type HistoryEntry,
  type Template,
} from '../../lib/storage';
import { FormField } from '../common/FormField';
import { useToast } from '../common/Toast';
import { useI18n } from '../common/i18n';
import { Section } from './CustomizePanel';

interface Props {
  design: QrDesign;
  content: QrContent;
  onApplyDesign: (design: QrDesign) => void;
  onApplyContent: (content: QrContent) => void;
  /** Bumped by the parent after each download so history refreshes. */
  historyVersion: number;
}

export function SavedPanel({
  design,
  content,
  onApplyDesign,
  onApplyContent,
  historyVersion,
}: Props) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [withContent, setWithContent] = useState(false);
  const [historyOn, setHistoryOn] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

  useEffect(() => {
    void listTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
    void isHistoryEnabled()
      .then(setHistoryOn)
      .catch(() => setHistoryOn(false));
  }, []);
  useEffect(() => {
    if (historyOn)
      void listHistory()
        .then(setHistory)
        .catch(() => setHistory([]));
  }, [historyOn, historyVersion]);

  const save = async () => {
    const template: Template = {
      id: newId(),
      name: name.trim() || t('saved.namePlaceholder'),
      createdAt: Date.now(),
      design,
    };
    if (withContent) template.content = content;
    setTemplates(await addTemplate(template));
    setName('');
    toast({ text: t('saved.savedOk'), tone: 'success' });
  };
  const importFile = async (file: File) => {
    try {
      const incoming = templatesFromJson(await file.text());
      const ids = new Set(incoming.map((x) => x.id));
      const merged = [...incoming, ...templates.filter((x) => !ids.has(x.id))];
      await saveTemplates(merged);
      setTemplates(merged);
      toast({ text: t('saved.imported', { count: incoming.length }), tone: 'success' });
    } catch (e) {
      toast({ text: t(e instanceof Error ? e.message : 'errors.templates.file'), tone: 'error' });
    }
  };
  const copyStyleLink = async () => {
    const url = `${location.origin}${location.pathname}${designToHash(design)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ text: t('saved.shareLinkCopied'), tone: 'success' });
    } catch {
      toast({ text: t('errors.clipboard'), tone: 'error' });
    }
  };

  return (
    <Section id="saved" title={t('saved.title')}>
      <div className="space-y-6">
        <p className="hint mt-0">{t('saved.intro')}</p>

        <div className="space-y-3">
          <FormField label={t('saved.name')}>
            {({ id }) => (
              <input
                id={id}
                className="input"
                value={name}
                maxLength={80}
                placeholder={t('saved.namePlaceholder')}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </FormField>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--accent)]"
              checked={withContent}
              onChange={(e) => setWithContent(e.target.checked)}
            />
            {t('saved.includeContent')}
          </label>
          <button type="button" className="btn btn-secondary" onClick={() => void save()}>
            {t('saved.save')}
          </button>
        </div>

        {templates.length === 0 ? (
          <p className="text-sm text-muted">{t('saved.empty')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-[10px] border border-border">
            {templates.map((tpl) => (
              <li key={tpl.id} className="flex items-center gap-2 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{tpl.name}</p>
                  <p className="text-xs text-muted">
                    {tpl.content ? t('saved.withContent') : t('saved.styleOnly')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onApplyDesign(tpl.design);
                    if (tpl.content) onApplyContent(tpl.content);
                  }}
                >
                  {t('saved.apply')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label={t('saved.delete', { name: tpl.name })}
                  onClick={() => void deleteTemplate(tpl.id).then(setTemplates)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={templates.length === 0}
            onClick={() =>
              downloadBlob(
                new Blob([templatesToJson(templates)], { type: 'application/json' }),
                'pakkaqr-designs.json',
              )
            }
          >
            {t('saved.export')}
          </button>
          <label className="btn btn-secondary btn-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--focus)]">
            {t('saved.import')}
            <input
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void copyStyleLink()}
          >
            {t('saved.shareLink')}
          </button>
          <p className="hint">{t('saved.shareLinkNote')}</p>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
            <input
              type="checkbox"
              role="switch"
              className="h-5 w-5 accent-[var(--accent)]"
              checked={historyOn}
              aria-describedby="history-note"
              onChange={(e) => {
                const on = e.target.checked;
                setHistoryOn(on);
                if (!on) setHistory([]);
                void setHistoryEnabled(on);
              }}
            />
            {t('saved.historyToggle')}
          </label>
          <p id="history-note" className="hint -mt-2">
            {t('saved.historyNote')}
          </p>
          {historyOn && (
            <>
              <h3 className="text-sm font-semibold">{t('saved.recent')}</h3>
              {history.length === 0 ? (
                <p className="text-sm text-muted">{t('saved.historyEmpty')}</p>
              ) : (
                <ul className="divide-y divide-border rounded-[10px] border border-border">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center gap-2 p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{h.payload}</p>
                        <p className="text-xs text-muted">
                          {t(`type.${h.content.type}`)} · {date.format(h.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onApplyContent(h.content)}
                      >
                        {t('saved.historyUse')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={history.length === 0}
                onClick={() => void clearHistory().then(() => setHistory([]))}
              >
                {t('saved.historyClear')}
              </button>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
