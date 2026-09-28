import { readFileSync } from "node:fs";
export const SCREENS = JSON.parse(readFileSync(new URL("./screens.json", import.meta.url), "utf8"));
