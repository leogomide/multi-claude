import React, { createContext, useContext, useMemo, useState } from "react";

interface BreadcrumbContextValue {
	crumbs: string[];
	setCrumbs: (crumbs: string[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
	crumbs: [],
	setCrumbs: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
	const [crumbs, setCrumbs] = useState<string[]>([]);
	const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
	return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumb() {
	return useContext(BreadcrumbContext);
}
