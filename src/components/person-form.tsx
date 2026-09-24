"use client";

import { useId } from "react";
import { InfoTip } from "@/components/info-tip";
import type { Locale } from "@/lib/i18n";
import { fill, t } from "@/lib/i18n";

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

/** Label, ⓘ explanation and control, laid out the same for every field. */
function Field({
  id,
  label,
  info,
  infoLabel,
  className = "",
  children,
}: {
  id: string;
  label: string;
  info: string;
  infoLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="relative mb-1.5 flex items-center gap-1">
        <label htmlFor={id} className="field-label !mb-0">
          {label}
        </label>
        <InfoTip label={infoLabel}>{info}</InfoTip>
      </div>
      {children}
    </div>
  );
}

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
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const set = (k: keyof PersonFields, v: string | boolean) => onChange({ ...value, [k]: v });
  const about = (label: string) => fill(c.infoAbout, { field: label });
  const field = (k: string, label: string, info: string, control: React.ReactNode, className = "") => (
    <Field id={id(k)} label={label} info={info} infoLabel={about(label)} className={className}>
      {control}
    </Field>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <p className="text-xs leading-relaxed text-muted sm:col-span-2">{c.formIntro}</p>
      {field(
        "given",
        c.given,
        c.infoGiven,
        <input
          id={id("given")}
          className="field"
          value={value.givenName}
          onChange={(e) => set("givenName", e.target.value)}
          placeholder={c.phGiven}
          autoComplete="off"
          required
        />,
      )}
      {field(
        "family",
        c.family,
        c.infoFamily,
        <input
          id={id("family")}
          className="field"
          value={value.familyName}
          onChange={(e) => set("familyName", e.target.value)}
          placeholder={c.phFamily}
          autoComplete="off"
        />,
      )}
      {field(
        "native",
        c.native,
        c.infoNative,
        <input
          id={id("native")}
          className="field font-devanagari"
          value={value.nativeName}
          onChange={(e) => set("nativeName", e.target.value)}
          placeholder={c.phNative}
          lang="hi"
          autoComplete="off"
        />,
        "sm:col-span-2",
      )}
      {field(
        "gender",
        c.gender,
        c.infoGender,
        <select id={id("gender")} className="field" value={value.gender} onChange={(e) => set("gender", e.target.value)}>
          <option value="UNKNOWN">{c.unknown}</option>
          <option value="FEMALE">{c.female}</option>
          <option value="MALE">{c.male}</option>
          <option value="OTHER">{c.other}</option>
        </select>,
      )}
      {field(
        "dob",
        c.dob,
        c.infoDob,
        <input id={id("dob")} className="field" type="date" value={value.birthDate} onChange={(e) => set("birthDate", e.target.value)} />,
      )}
      {field(
        "village",
        c.village,
        c.infoVillage,
        <input
          id={id("village")}
          className="field"
          value={value.village}
          onChange={(e) => set("village", e.target.value)}
          placeholder={c.phVillage}
        />,
      )}
      {field(
        "gotra",
        c.gotra,
        c.infoGotra,
        <input id={id("gotra")} className="field" value={value.gotra} onChange={(e) => set("gotra", e.target.value)} placeholder={c.phGotra} />,
      )}
      {extra && (
        <>
          {field(
            "aka",
            c.aka,
            c.infoAka,
            <input
              id={id("aka")}
              className="field"
              value={value.alsoKnownAs}
              onChange={(e) => set("alsoKnownAs", e.target.value)}
              placeholder={c.phAka}
              autoComplete="off"
            />,
          )}
          {field(
            "birthPlace",
            c.birthPlace,
            c.infoBirthPlace,
            <input
              id={id("birthPlace")}
              className="field"
              value={value.birthPlace ?? ""}
              onChange={(e) => set("birthPlace", e.target.value)}
              placeholder={c.phBirthPlace}
            />,
          )}
          <div className="relative flex items-center gap-1 text-sm sm:col-span-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={value.isLiving} onChange={(e) => set("isLiving", e.target.checked)} />
              {c.living}
            </label>
            <InfoTip label={about(c.living)}>{c.infoLiving}</InfoTip>
          </div>
          {!value.isLiving &&
            field(
              "death",
              c.deathDate,
              c.infoDeath,
              <input
                id={id("death")}
                className="field"
                type="date"
                value={value.deathDate ?? ""}
                onChange={(e) => set("deathDate", e.target.value)}
              />,
            )}
          {field(
            "notes",
            c.notes,
            c.infoNotes,
            <textarea
              id={id("notes")}
              className="field min-h-20"
              value={value.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder={c.phNotes}
            />,
            "sm:col-span-2",
          )}
        </>
      )}
    </div>
  );
}
