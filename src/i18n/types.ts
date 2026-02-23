export interface TranslationDictionary {
	common: {
		loading: string;
		yes: string;
		no: string;
		cancelled: string;
		navHint: string;
		pressAnyKey: string;
		whatToDo: string;
	};
	validation: {
		nameRequired: string;
		apiKeyRequired: string;
		modelNameRequired: string;
	};
	selector: {
		selectProvider: string;
		selectModel: string;
		noProviders: string;
		noModels: string;
		providerLabel: string;
	};
	menu: {
		addProvider: string;
		editProvider: string;
		removeProvider: string;
		manageModels: string;
		listProviders: string;
		openConfigFolder: string;
		openedConfigFolder: string;
		changeLanguage: string;
		exit: string;
	};
	addFlow: {
		selectTemplate: string;
		nameLabel: string;
		apiKeyLabel: string;
		success: string;
		defaultModels: string;
	};
	editFlow: {
		selectProvider: string;
		nameLabel: string;
		apiKeyLabel: string;
		noProviders: string;
		success: string;
	};
	removeFlow: {
		selectProvider: string;
		confirmRemove: string;
		noProviders: string;
		success: string;
	};
	modelsFlow: {
		selectProvider: string;
		modelsForProvider: string;
		noModels: string;
		noModelsToRemove: string;
		noUserModels: string;
		addModel: string;
		removeModel: string;
		back: string;
		modelNameLabel: string;
		selectModelToRemove: string;
		modelAdded: string;
		modelRemoved: string;
		modelCount: (params: { count: number }) => string;
		defaultTag: string;
	};
	listFlow: {
		title: string;
		noProviders: string;
		modelCount: (params: { count: number }) => string;
	};
	manageProviders: {
		title: string;
		addProvider: string;
		back: string;
		noProviders: string;
	};
	editProvider: {
		title: string;
		editName: string;
		editApiKey: string;
		manageModels: string;
		removeProvider: string;
		back: string;
		nameUpdated: string;
		apiKeyUpdated: string;
	};
	settings: {
		title: string;
		openConfigFolder: string;
		changeLanguage: string;
		resetAll: string;
		confirmResetAll: string;
		resetAllSuccess: string;
		back: string;
	};
	languageSelect: {
		title: string;
		changed: string;
	};
	mainMenu: {
		title: string;
		startClaude: string;
		options: string;
		manageProviders: string;
		manageInstallations: string;
		changeLanguage: string;
		exit: string;
		settings: string;
		addProvider: string;
		noProviders: string;
	};
	providerSubmenu: {
		title: string;
		back: string;
	};
	searchSelect: {
		placeholder: string;
		noResults: string;
		resultCount: (params: { filtered: number; total: number }) => string;
	};
	apiModels: {
		fetching: string;
		fetchError: string;
		fetchSuccess: (params: { count: number }) => string;
		fetchModels: string;
		authError: string;
		networkError: string;
		validatingKey: string;
		keyInvalid: string;
	};
	anthropic: {
		loginInProgress: string;
		waitingForAuth: string;
		loginSuccess: string;
		loginFailed: string;
		authExpired: string;
		reAuthenticate: string;
		authenticated: string;
		notAuthenticated: string;
		noApiKeyNeeded: string;
	};
	installations: {
		title: string;
		addInstallation: string;
		editInstallation: string;
		removeInstallation: string;
		nameLabel: string;
		defaultName: string;
		defaultDesc: string;
		confirmRemove: string;
		added: string;
		removed: string;
		renamed: string;
		selectInstallation: string;
		noInstallations: string;
		requiredForAnthropic: string;
		createForAnthropic: string;
		editName: string;
		back: string;
	};
	sidebar: {
		providerInfo: string;
		modelInfo: string;
		installationInfo: string;
		installationPath: string;
		manageInstallationsDesc: string;
		name: string;
		template: string;
		models: string;
		baseUrl: string;
		source: string;
		sourceDefault: string;
		sourceUser: string;
		modelsViaApi: string;
		noProviders: string;
		addProviderDesc: string;
		manageProvidersDesc: string;
		settingsDesc: string;
		languageDesc: string;
		exitDesc: string;
		context: string;
		maxOutput: string;
		inPrice: string;
		outPrice: string;
		modalities: string;
		tools: string;
		reasoning: string;
		moderated: string;
		authStatus: string;
		type: string;
		params: string;
		quantization: string;
		architecture: string;
		fileSize: string;
	};
	localProvider: {
		noApiKeyNeeded: string;
	};
	footer: {
		navigate: string;
		select: string;
		quit: string;
		confirm: string;
		next: string;
		back: string;
		anyKey: string;
		search: string;
	};
}
