"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fromSwissDateTimeParts,
  toSwissDateTimeParts,
} from "@/lib/datetime";

type Props = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function SwissDateTimeInput({
  id = "consumedAt",
  label = "Datum & Uhrzeit",
  value,
  onChange,
  required,
}: Props) {
  const initial = toSwissDateTimeParts(value);
  const [dateText, setDateText] = useState(initial.date);
  const [timeText, setTimeText] = useState(initial.time);
  const [invalid, setInvalid] = useState(false);
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    const next = toSwissDateTimeParts(value);
    setSyncedValue(value);
    setDateText(next.date);
    setTimeText(next.time);
    setInvalid(false);
  }

  function commit(nextDate: string, nextTime: string) {
    const combined = fromSwissDateTimeParts(nextDate, nextTime);
    if (!combined) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(combined);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-date`}>{label}</Label>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <Input
          id={`${id}-date`}
          inputMode="numeric"
          placeholder="tt.mm.jjjj"
          value={dateText}
          required={required}
          onChange={(e) => setDateText(e.target.value)}
          onBlur={() => commit(dateText, timeText)}
          aria-invalid={invalid}
        />
        <Input
          id={`${id}-time`}
          inputMode="numeric"
          placeholder="ss:mm"
          value={timeText}
          required={required}
          onChange={(e) => setTimeText(e.target.value)}
          onBlur={() => commit(dateText, timeText)}
          aria-invalid={invalid}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Format: tt.mm.jjjj · 24-Stunden-Zeit (z. B. 12.08.2026 15:46)
      </p>
      {invalid ? (
        <p className="text-xs text-destructive">
          Ungültiges Datum oder Uhrzeit.
        </p>
      ) : null}
    </div>
  );
}
