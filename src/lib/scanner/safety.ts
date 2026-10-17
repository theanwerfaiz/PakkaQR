/** Warnings shown before opening a scanned link. */
export type LinkWarning =
  'dangerousScheme' | 'punycode' | 'mixedScript' | 'notHttps' | 'credentials' | 'ipHost';

const DANGEROUS = /^(javascript|data|vbscript|file|blob|about|chrome|intent):/i;

export function isDangerousScheme(text: string): boolean {
  return DANGEROUS.test(text.trim());
}

/** Only web links may be opened (after confirmation). */
export function isOpenable(text: string): boolean {
  return /^https?:\/\//i.test(text.trim()) && !isDangerousScheme(text);
}

export function linkWarnings(text: string): LinkWarning[] {
  const s = text.trim();
  if (isDangerousScheme(s)) return ['dangerousScheme'];
  const warnings: LinkWarning[] = [];
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return warnings;
  }
  if (url.protocol === 'http:') warnings.push('notHttps');
  if (url.username || url.password) warnings.push('credentials');
  if (url.hostname.split('.').some((label) => label.startsWith('xn--'))) warnings.push('punycode');
  // The raw text may hold the Unicode form that URL() turned into punycode.
  const rawHost = /^https?:\/\/(?:[^@/]*@)?([^/:?#]+)/i.exec(s)?.[1] ?? '';
  if (/[^ -~]/.test(rawHost)) {
    if (!warnings.includes('punycode')) warnings.push('punycode');
    if (/[a-z]/i.test(rawHost)) warnings.push('mixedScript');
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname) || url.hostname.startsWith('['))
    warnings.push('ipHost');
  return warnings;
}
