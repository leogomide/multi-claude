import { execSync } from "node:child_process";
import { platform } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const file = resolve(dir, "Whistleronic.wav");

const os = platform();

if (os === "darwin") {
	execSync(`afplay "${file}"`);
} else if (os === "win32") {
	execSync(
		`powershell -NoProfile -c "(New-Object Media.SoundPlayer '${file.replaceAll("'", "''")}').PlaySync()"`,
	);
} else {
	execSync(`aplay "${file}"`);
}
