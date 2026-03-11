/**
 * Executa o biome lint silenciosamente (sem output no console).
 * Sempre retorna exit code 0 para nao bloquear hooks.
 * Cross-platform (Windows/macOS/Linux).
 */
import { execSync } from "node:child_process";

try {
	execSync("pnpm lint", { stdio: "ignore" });
} catch {
	// Ignora erros - o lint é best-effort no hook
}
