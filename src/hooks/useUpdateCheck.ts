import { useEffect, useState } from "react";
import { checkForUpdate } from "../services/version-check.ts";

interface UpdateCheckState {
	latestVersion: string | null;
}

export function useUpdateCheck(currentVersion: string): UpdateCheckState {
	const [latestVersion, setLatestVersion] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 3000);

		checkForUpdate(currentVersion, controller.signal).then((result) => {
			clearTimeout(timeout);
			if (result.updateAvailable) {
				setLatestVersion(result.latestVersion);
			}
		});

		return () => {
			clearTimeout(timeout);
			controller.abort();
		};
	}, []);

	return { latestVersion };
}
