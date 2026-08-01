"use client";

import { X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { SKILLS_BY_INDUSTRY } from "@/lib/mock/seed";

const ALL_SKILLS = Array.from(new Set(Object.values(SKILLS_BY_INDUSTRY).flat())).sort();

export function SkillPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (skills: string[]) => void;
}) {
  const toggle = (skill: string) => {
    onChange(selected.includes(skill) ? selected.filter((s) => s !== skill) : [...selected, skill]);
  };

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {selected.map((skill) => (
            <Badge key={skill} variant="glass" className="gap-1 border-primary/40 text-primary-soft">
              {skill}
              <button
                type="button"
                onClick={() => toggle(skill)}
                aria-label={`Remove ${skill}`}
                className="ml-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Command className="rounded-2xl! border border-border bg-white/5 backdrop-blur-xl">
        <CommandInput placeholder="Search skills — try 'React' or 'Sales'..." />
        <CommandList className="max-h-64!">
          <CommandEmpty>No skills found.</CommandEmpty>
          <CommandGroup>
            {ALL_SKILLS.map((skill) => (
              <CommandItem
                key={skill}
                value={skill}
                data-checked={selected.includes(skill)}
                onSelect={() => toggle(skill)}
              >
                {skill}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
