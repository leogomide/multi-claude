#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { join } from "node:path";

// Mimics the exact spawn pattern from cli.ts
const diagnosticPath = join(import.meta.dir, "diagnose-resize.ts");
const result = spawnSync(process.execPath, [diagnosticPath], { stdio: "inherit" });
process.exit(result.status ?? 1);
