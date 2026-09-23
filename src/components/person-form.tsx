"use client";

import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export type PersonFields = {
  givenName: string;
  familyName: string;
  nativeName: string;
  alsoKnownAs: string;
  gender: string;
  birthDate: string;
  village: string;
  gotra: string;
  isLiving: boolean;
  birthPlace?: string;
  deathDate?: string;
  notes?: string;
};

export const emptyPerson = (): PersonFields => ({
  givenName: "",
  familyName: "",
  nativeName: "",
  alsoKnownAs: "",
  gender: "UNKNOWN",
  birthDate: "",
  village: "",
  gotra: "",
  isLiving: true,
  birthPlace: "",
  deathDate: "",
  notes: "",
});

export function PersonForm({
  locale,
  value,
  onChange,
  extra = false,
}: {
  locale: Locale;
  value: PersonFields;
  onChange: (v: PersonFields) => void;
  extra?: boolean;
}) {
  const c = t(locale);
  const set = (k: keyof PersonFields, v: string | boolean) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="field-label">{c.given}</span>
        <input className="field" value={value.givenName} onChange={(e) => set("givenName", e.target.value)} required />
      </label>
      <label className="block">
        <span className="field-label">{c.family}</span>
        <input className="field" value={value.familyName} onChange={(e) => set("familyName", e.target.value)} />
      </label>
      <label className="block sm:col-span-2">
        <span className="field-label">{c.native}</span>
        <input
          className="field font-devanagari"
          value={value.nativeName}
          onChange={(e) => set("nativeName", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="field-label">{c.gender}</span>
        <select className="field" value={value.gender} onChange={(e) => set("gender", e.target.value)}>
          <option value="UNKNOWN">{c.unknown}</option>
          <option value="FEMALE">{c.female}</option>
          <option value="MALE">{c.male}</option>
          <option value="OTHER">{c.other}</option>
        </select>
      </label>
      <label className="block">
        <span className="field-label">{c.dob}</span>
        <input
          className="field"
          type="date"
          value={value.birthDate}
          onChange={(e) => set("birthDate", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="field-label">{c.village}</span>
        <input className="field" value={value.village} onChange={(e) => set("village", e.target.value)} />
      </label>
      <label className="block">
        <span className="field-label">{c.gotra}</span>
        <input className="field" value={value.gotra} onChange={(e) => set("gotra", e.target.value)} />
      </label>
      {extra && (
        <>
          <label className="block">
            <span className="field-label">{c.aka}</span>
            <input className="field" value={value.alsoKnownAs} onChange={(e) => set("alsoKnownAs", e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">{c.birthPlace}</span>
            <input
              className="field"
              value={value.birthPlace ?? ""}
              onChange={(e) => set("birthPlace", e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2 text-sm">
            <input
              type="checkbox"
              checked={value.isLiving}
              onChange={(e) => set("isLiving", e.target.checked)}
            />
            {c.living}
          </label>
          {!value.isLiving && (
            <label className="block">
              <span className="field-label">{c.deathDate}</span>
              <input
                className="field"
                type="date"
                value={value.deathDate ?? ""}
                onChange={(e) => set("deathDate", e.target.value)}
              />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="field-label">{c.notes}</span>
            <textarea
              className="field min-h-20"
              value={value.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </label>
        </>
      )}
    </div>
  );
}
