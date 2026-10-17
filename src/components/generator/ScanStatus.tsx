import type { FixId, Issue, Status } from '../../lib/scannability/checks';
import { useT } from '../common/i18n';

interface Props {
  status: Status | 'checking' | 'idle';
  issues: Issue[];
  onFix: (fix: FixId) => void;
}

const ICON: Record<Status | 'checking', string> = {
  great: '✅',
  risky: '⚠️',
  fail: '❌',
  checking: '…',
};
const TONE: Record<Status | 'checking', string> = {
  great: 'border-success text-success',
  risky: 'border-warning text-warning',
  fail: 'border-danger text-danger',
  checking: 'border-border text-muted',
};

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
        className={`flex items-start gap-2 rounded-[10px] border-2 bg-surface px-3 py-2 text-sm font-semibold ${TONE[status]}`}
      >
        <span aria-hidden="true">{ICON[status]}</span>
        <span className="text-text">{headline}</span>
      </div>
      {status !== 'checking' && issues.length > 0 && (
        <ul className="mt-2 space-y-2 text-sm">
          {issues.map((issue) => (
            <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted">{t(issue.reason, issue.vars)}</span>
              {issue.fix && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
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
