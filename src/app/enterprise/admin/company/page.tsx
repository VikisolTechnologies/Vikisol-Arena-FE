"use client";

import { useEffect, useState } from "react";
import { m } from "motion/react";
import { Info, X } from "lucide-react";
import { rise, shake } from "@/lib/motion";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { Button } from "@/components/bplus/Button";
import { Skeleton } from "@/components/bplus/Primitives";
import { CompanyMark } from "@/components/career/CompanyMark";
import { Panel } from "@/components/dash/Parts";
import { getMyEnterpriseProfile, saveMyEnterpriseProfile } from "@/lib/api/enterprise";
import { useIndustries } from "@/lib/data/industries";
import type { CompanySize, EnterpriseProfile } from "@/lib/types";

const SIZES: CompanySize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const field = "mt-1.5 min-h-12 w-full rounded-xl border border-field-line bg-transparent px-3 text-[15px] outline-none focus-visible:border-primary aria-[invalid=true]:border-danger-on-dark [&>option]:text-paper-ink";

/** Company settings — Company profile (flow §8; no board — designed in B+). Same
 *  get/saveMyEnterpriseProfile. Logo upload, website and verification wait for gap #29. */
export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const industries = useIndustries(profile?.industry);
  const [role, setRole] = useState("");
  const [touched, setTouched] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyEnterpriseProfile().then(setProfile).catch(() => setError("Your company profile didn't load. Refresh to try again."));
  }, []);

  const update = <K extends keyof EnterpriseProfile>(key: K, value: EnterpriseProfile[K]) => {
    setSaved(false);
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  };
  const addRole = () => {
    const r = role.trim();
    if (!profile || !r || profile.hiringFor.includes(r)) return;
    update("hiringFor", [...profile.hiringFor, r]);
    setRole("");
  };
  const nameError = touched && profile && !profile.companyName.trim() ? "Add your company name." : "";

  const save = async () => {
    if (!profile) return;
    setTouched(true);
    if (!profile.companyName.trim()) {
      setAttempt((a) => a + 1);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveMyEnterpriseProfile({ ...profile, companyName: profile.companyName.trim() });
      setSaved(true);
    } catch {
      setError("Changes didn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CompanyAdminShell title="Company profile">
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      {!profile ? (
        !error && <Skeleton className="h-96 max-w-[620px]" />
      ) : (
        <m.div initial="hidden" animate="shown" className="grid max-w-[980px] gap-5 lg:grid-cols-[1fr_300px]">
          <m.div variants={rise}>
            <Panel>
              <m.div key={attempt} animate={attempt && nameError ? { x: [...shake.x] } : undefined} transition={shake.transition}>
                <label htmlFor="companyName" className="block text-[15px] font-semibold">Company name</label>
                <input id="companyName" value={profile.companyName} onChange={(e) => update("companyName", e.target.value)} onBlur={() => setTouched(true)} aria-invalid={!!nameError} aria-describedby="companyName-error" maxLength={100} className={field} />
                <p id="companyName-error" className="mt-1 min-h-5 text-[13px] font-semibold text-danger-on-dark">{nameError}</p>
              </m.div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[15px] font-semibold">Industry
                  <select value={profile.industry} onChange={(e) => update("industry", e.target.value)} className={field}>
                    {industries.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
                <label className="block text-[15px] font-semibold">Company size
                  <select value={profile.size} onChange={(e) => update("size", e.target.value as CompanySize)} className={field}>
                    {SIZES.map((x) => <option key={x} value={x}>{x} people</option>)}
                  </select>
                </label>
              </div>
              <fieldset className="mt-5">
                <legend className="text-[15px] font-semibold">What you hire for</legend>
                {profile.hiringFor.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {profile.hiringFor.map((r) => (
                      <li key={r} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-foreground/8 pl-3.5 text-[14px]">{r}<button type="button" aria-label={`Remove ${r}`} onClick={() => update("hiringFor", profile.hiringFor.filter((x) => x !== r))} className="grid size-10 place-items-center rounded-full hover:bg-foreground/10"><X className="size-4" aria-hidden /></button></li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex gap-2">
                  <label className="flex-1"><span className="sr-only">Add a role</span>
                    <input value={role} onChange={(e) => setRole(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRole(); } }} placeholder="e.g. Community Program Assistant" className={field.replace("mt-1.5 ", "")} />
                  </label>
                  <button type="button" onClick={addRole} className="min-h-12 rounded-full border border-field-line px-4 text-[15px] font-semibold hover:bg-foreground/5">Add</button>
                </div>
              </fieldset>
              <div className="mt-6 max-w-[260px]"><Button loading={saving} success={saved} onClick={save}>{saved ? "Saved" : "Save changes"}</Button></div>
            </Panel>
          </m.div>
          <m.aside variants={rise} custom={1} className="space-y-4">
            <Panel title="How people see you">
              <div className="flex items-center gap-3">
                <CompanyMark name={profile.companyName || "Company"} />
                <span><span className="block text-[16px] font-semibold">{profile.companyName || "Your company"}</span><span className="text-[14px] text-faint">{profile.industry} · {profile.size} people</span></span>
              </div>
            </Panel>
            <p className="flex gap-2 px-1 text-[13px] text-faint"><Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Logo upload, website and the verified badge arrive with company verification.</p>
          </m.aside>
        </m.div>
      )}
    </CompanyAdminShell>
  );
}
