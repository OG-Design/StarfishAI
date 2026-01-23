# Ollama docker setup
## Dependencies
- docker
- docker-compose

## Run
Navigate to the *ollama* folder

Then run the command:
```bash
docker-compose up -d
```

Check docker processes
```bash
docker ps
```

Execute a command
```bash
docker exec -it ollama ollama run <COMMAND>
```


Download model
```bash
docker exec -it ollama ollama run llama3
```
