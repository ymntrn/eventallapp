import { useId } from 'react';
import { TONIGHT_START_TIMES } from '../lib/dates';
import { t } from '../i18n/tr';

/** "Bu akşam" start-time picker: "Şu andan" or a time on the same night. */
export function TonightTime({ value, onChange, compact }: { value: string | null; onChange(v: string | null): void; compact?: boolean }) {
  const id = useId();
  return (
    <label className={`tonight-time${compact ? ' tonight-time--compact' : ''}`} htmlFor={id}>
      <span className={compact ? 'visually-hidden' : undefined}>{t.tonightFromLabel}</span>
      <select id={id} className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{t.tonightFromNow}</option>
        {TONIGHT_START_TIMES.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </label>
  );
}
