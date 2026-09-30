/** Production stand-in for src/lib/mock/people.ts (see preview-off/world.ts). */
import type * as Real from "@/lib/mock/people";

export type PreviewNeighbour = Real.PreviewNeighbour;
export const PREVIEW_NEIGHBOURS: typeof Real.PREVIEW_NEIGHBOURS = [];
export const previewPhotoForName: typeof Real.previewPhotoForName = () => undefined as ReturnType<typeof Real.previewPhotoForName>;
export const previewPeopleFor: typeof Real.previewPeopleFor = () => [];
