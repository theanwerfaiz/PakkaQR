import type { FixId, Issue, Status } from '../../lib/scannability/checks';
import { useT } from '../common/i18n';

interface Props {
  status: Status | 'checking' | 'idle';
  issues: Issue[];
  onFix: (fix: FixId) => void;
}

const TONE: Record<Status | 'checking', string> = {
  great: 'border-success',
  risky: 'border-warning bg-warning-soft',
  fail: 'border-danger',
  checking: 'border-border',
};

/** The scan test's verdict in words, with one-tap fixes. The stamp shows the same visually. */
export function ScanStatus({ status, issues, onFix }: Props) {
  const t = useT();
  if (status === 'idle') return <div aria-live="polite" role="status" />;
  const firstReason = issues[0] ? t(issues[0].reason, issues[0].vars) : '';
  const headline =
    status === 'great'
      ? t('status.great')
      : status === 'checking'
        ? t('status.checking')
        : t(`status.${status}`, { reason: firstReason });
  return (
    <div>
      <div
        role="status"
        aria-live="polite"
        data-testid="scan-status"
        data-status={status}
        className={`rounded-r-[14px] border-l-4 py-2 pr-3 pl-4 text-[0.95rem] font-semibold ${TONE[status]}`}
      >
        {headline}
      </div>
      {status !== 'checking' && issues.length > 0 && (
        <ul className="mt-3 space-y-2 text-[0.95rem]">
          {issues.map((issue) => (
            <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted">{t(issue.reason, issue.vars)}</span>
              {issue.fix && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onFix(issue.fix!)}
                >
                  {t(`status.fixes.${issue.fix}`)}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
