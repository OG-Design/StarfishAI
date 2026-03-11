// Ollama Compose config type map
export type OllamaComposeConfig = {
	name: string;
	configFile: {
		version: string;
		services: {
			ollama: {
				image: string;
				container_name: string;
				ports: string[];
				volumes: string[];
				restart: string;
				environment: {
					OLLAMA_NUM_PARALLEL: string;
					OLLAMA_MAX_LOADED_MODELS: string;
					[key: string]: string;
				};
			};
			[serviceName: string]: any;
		};
		volumes: {
			[volumeName: string]: any;
		};
	};
};
