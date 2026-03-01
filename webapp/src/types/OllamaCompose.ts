export interface OllamaCompose {
  version: string;
  services: {
    ollama: {
      image: string;
      container_name: string;
      ports: string[];
      volumes: string[];
      restart: string;
      deploy: {
        resources: {
          reservations: {
            devices: Array<{
              driver: string;
              count: string;
              capabilities: string[];
            }>;
          };
        };
      };
      environment: {
        OLLAMA_NUM_PARALLEL: string;
        OLLAMA_MAX_LOADED_MODELS: string;
      };
    };
  };
  volumes: {
    ollama_data: null;
  };
}