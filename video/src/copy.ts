/**
 * Every string that appears on screen, in both languages.
 *
 * Wording is lifted from the app's own locale files (src/i18n/locales/en.ts and
 * pt-BR.ts) wherever the video reproduces a TUI screen, so the demo shows
 * exactly what the user will see when they run mclaude.
 */

export type Locale = "en" | "pt-BR";

export type Copy = {
	intro: { tagline: string; footnote: string };
	terminalOpen: {
		caption: string;
		loading: string;
		starting: string;
		configLoaded: string;
		providersConfigured: string;
	};
	mainMenu: {
		caption: string;
		groupStart: string;
		groupOptions: string;
		defaultLaunch: string;
		manageProviders: string;
		manageInstallations: string;
		settings: string;
		exit: string;
		providerInfo: string;
		name: string;
		auth: string;
		authenticated: string;
		template: string;
		models: string;
		modelsValue: string;
		baseUrl: string;
	};
	modelSelect: {
		caption: string;
		title: string;
		modelInfo: string;
		name: string;
		context: string;
		maxOutput: string;
		tools: string;
		reasoning: string;
		yes: string;
	};
	flags: {
		caption: string;
		title: string;
		groupPermissions: string;
		groupDevelopment: string;
		groupEnvironment: string;
		groupExperimental: string;
		loadDotenv: string;
		flagInfo: string;
		flag: string;
		description: string;
		descSkipPermissions: string;
	};
	launch: { caption: string; withEffort: string };
	// Statusline labels come from src/statusline-script.mjs (const L).
	statusline: { session: string; api: string; cost: string; left: string };
	footer: {
		navigate: string;
		select: string;
		quit: string;
		back: string;
		search: string;
		toggle: string;
		launch: string;
	};
	outro: { heading: string; requires: string; sponsoredBy: string };
};

const en: Copy = {
	intro: {
		tagline: "One CLI. Any Provider.",
		footnote: "20+ providers for Claude Code",
	},
	terminalOpen: {
		caption: "Launch mclaude from any terminal",
		loading: "Loading",
		starting: "Starting mclaude...",
		configLoaded: "Configuration loaded",
		providersConfigured: "4 providers configured",
	},
	mainMenu: {
		caption: "Pick the provider you want to code with",
		groupStart: "Start Claude Code",
		groupOptions: "Options",
		defaultLaunch: "Claude Code (default)",
		manageProviders: "Manage providers",
		manageInstallations: "Manage installations",
		settings: "Settings",
		exit: "Exit",
		providerInfo: "Provider Info",
		name: "Name",
		auth: "Auth",
		authenticated: "Authenticated",
		template: "Template",
		models: "Models",
		modelsValue: "12 models",
		baseUrl: "Base URL",
	},
	modelSelect: {
		caption: "Browse and search models from any provider",
		title: "Select a model",
		modelInfo: "Model Info",
		name: "Name",
		context: "Context",
		maxOutput: "Max output",
		tools: "Tools",
		reasoning: "Reasoning",
		yes: "Yes",
	},
	flags: {
		caption: "Configure launch options",
		title: "Launch options",
		groupPermissions: "Permissions",
		groupDevelopment: "Development",
		groupEnvironment: "Environment",
		groupExperimental: "Experimental",
		loadDotenv: "Load .env variables",
		flagInfo: "Flag Info",
		flag: "Flag",
		description: "Description",
		descSkipPermissions: "Skip all permission prompts",
	},
	launch: {
		caption: "Claude Code is running on Z.AI",
		withEffort: " with high effort · ",
	},
	statusline: { session: "Session", api: "API", cost: "Cost", left: "left" },
	footer: {
		navigate: "navigate",
		select: "select",
		quit: "quit",
		back: "back",
		search: "search",
		toggle: "toggle",
		launch: "launch",
	},
	outro: {
		heading: "Get Started",
		requires: "requires Node.js 22+",
		sponsoredBy: "SPONSORED BY",
	},
};

const ptBR: Copy = {
	intro: {
		tagline: "Um CLI. Qualquer provedor.",
		footnote: "20+ provedores para o Claude Code",
	},
	terminalOpen: {
		caption: "Rode o mclaude de qualquer terminal",
		loading: "Carregando",
		starting: "Iniciando mclaude...",
		configLoaded: "Configuração carregada",
		providersConfigured: "4 provedores configurados",
	},
	mainMenu: {
		caption: "Escolha o provedor para programar",
		groupStart: "Iniciar Claude Code",
		groupOptions: "Opções",
		defaultLaunch: "Claude Code (padrão)",
		manageProviders: "Gerenciar provedores",
		manageInstallations: "Gerenciar instalações",
		settings: "Configurações",
		exit: "Sair",
		providerInfo: "Info do Provedor",
		name: "Nome",
		auth: "Autenticação",
		authenticated: "Autenticado",
		template: "Template",
		models: "Modelos",
		modelsValue: "12 modelos",
		baseUrl: "URL Base",
	},
	modelSelect: {
		caption: "Navegue e busque modelos de qualquer provedor",
		title: "Selecione um modelo",
		modelInfo: "Info do Modelo",
		name: "Nome",
		context: "Contexto",
		maxOutput: "Saída máx.",
		tools: "Ferramentas",
		reasoning: "Raciocínio",
		yes: "Sim",
	},
	flags: {
		caption: "Configure as opções de lançamento",
		title: "Opções de lançamento",
		groupPermissions: "Permissões",
		groupDevelopment: "Desenvolvimento",
		groupEnvironment: "Ambiente",
		groupExperimental: "Experimental",
		loadDotenv: "Carregar variáveis de .env",
		flagInfo: "Info da Flag",
		flag: "Flag",
		description: "Descrição",
		descSkipPermissions: "Pular todos os prompts de permissão",
	},
	launch: {
		caption: "Claude Code rodando na Z.AI",
		withEffort: " com esforço alto · ",
	},
	statusline: { session: "Sessao", api: "API", cost: "Custo", left: "rest." },
	footer: {
		navigate: "navegar",
		select: "selecionar",
		quit: "sair",
		back: "voltar",
		search: "buscar",
		toggle: "alternar",
		launch: "iniciar",
	},
	outro: {
		heading: "Comece agora",
		requires: "requer Node.js 22+",
		sponsoredBy: "PATROCINADO POR",
	},
};

export const COPY: Record<Locale, Copy> = { en, "pt-BR": ptBR };

/** Strings that are identical in both languages — commands, brands, models. */
export const LITERAL = {
	brand: "multi-claude",
	octopus: "🐙",
	command: "mclaude",
	installCmd: "npm i -g @leogomide/multi-claude",
	runCmd: "$ mclaude",
	repo: "github.com/leogomide/multi-claude",
	sponsorName: "Flatt",
	provider: "Z.AI Coding Plan",
	providerBaseUrl: "api.z.ai/api/anthropic",
	model: "GLM-5.3",
	// From src/providers.ts modelSpecs["glm-5.3"]: 1_048_576 / 131_072
	modelContext: "1M tokens",
	modelMaxOutput: "128K tokens",
	skipPermissions: "--dangerously-skip-permissions",
	worktree: "--worktree",
	agentTeams: "Agent Teams [experimental]",
	cwd: "~/projects/my-app",
};
