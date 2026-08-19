import { useState, useRef, useEffect, useCallback } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}

function isoToDisplay(iso: string): string {
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function isValidDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function parseDisplayToISO(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return '';
  const d = parseInt(digits.slice(0, 2), 10);
  const m = parseInt(digits.slice(2, 4), 10);
  const y = parseInt(digits.slice(4, 8), 10);
  if (!isValidDate(y, m, d)) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function isoToDate(iso: string): Date | undefined {
  if (!iso || iso.length < 10) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (!isValidDate(y, m, d)) return undefined;
  return date;
}

export default function DateInput({
  value,
  onChange,
  placeholder = 'DD/MM/AAAA',
  label,
  error,
  disabled,
  min,
  max,
}: DateInputProps) {
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(isoToDisplay(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayValue(isoToDisplay(value));
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = '';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += '/' + digits.slice(2, 4);
    if (digits.length > 4) formatted += '/' + digits.slice(4, 8);
    setDisplayValue(formatted);

    if (digits.length === 8) {
      const iso = parseDisplayToISO(formatted);
      if (iso) onChange(iso);
    } else if (digits.length === 0) {
      onChange('');
    }
  }, [onChange]);

  const handleSelect = useCallback((date: Date | undefined) => {
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
    setOpen(false);
  }, [onChange]);

  const selectedDate = isoToDate(value);
  const minDate = isoToDate(min || '');
  const maxDate = isoToDate(max || '');

  return (
    <div>
      {label && <label className="bjj-label">{label}</label>}

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          className="bjj-input"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          autoComplete="off"
          style={{ paddingRight: '2.5rem', colorScheme: 'dark' }}
        />
        <button
          type="button"
          onClick={() => { inputRef.current?.focus(); setOpen(o => !o); }}
          disabled={disabled}
          style={{
            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: '#666', cursor: disabled ? 'not-allowed' : 'pointer', padding: '0.25rem', lineHeight: 1,
          }}
        >
          <CalendarIcon size={16} />
        </button>
      </div>

      {error && (
        <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.75rem', color: '#CC0000', marginTop: '0.25rem' }}>
          {error}
        </p>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-auto p-0"
          style={{ background: '#111', border: '1px solid #2A2A2A', color: '#FFF' }}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={selectedDate || new Date()}
            captionLayout="dropdown-years"
            disabled={disabled}
            style={{ color: '#FFF' } as React.CSSProperties}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
