import { app, BrowserWindow } from 'electron';
import { spawn, ChildProcess, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { stderr, stdout } from 'process';

let nestServer: ChildProcess | null = null;

process.env.ELECTRON_MODE = 'true';

/**
 * Parse a .env file into a key-value object.
 * Handles quotes and ignores comments / blank lines.
 */
function parseEnvFile(filePath: string): Record<string, string> {
    const vars: Record<string, string> = {};
    if (!fs.existsSync(filePath)) return vars;
    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const idx = line.indexOf('=');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();
        // strip matching quotes
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        vars[key] = val;
    }
    return vars;
}

function getEnvFilePath(): string {
    return app.isPackaged
        ? path.join(process.resourcesPath, '.env')
        : path.join(__dirname, '..', '..', '.env');
}

const dotenvVars = parseEnvFile(getEnvFilePath());
const API_PORT = dotenvVars.API_PORT || process.env.API_PORT || '3000';

function startDockerCompose() {
    const ollamaCompose = app.isPackaged ? path.join(process.resourcesPath, 'ollama', 'docker-compose.yml') : path.join(__dirname, 'resources', 'ollama', 'docker-compose.yml');
    const redisCompose = app.isPackaged ? path.join(process.resourcesPath, 'redis', 'docker-compose.yml') : path.join(__dirname, 'resources', 'redis', 'docker-compose.yml');

    return Promise.all([
        new Promise<void>((resolve, reject) => {
            exec(`docker-compose -f "${ollamaCompose}" up -d`, (err, stdout, stderr) => {
                if (err) {
                    console.error('Ollama docker-compose error:', err);
                    reject(err);
                } else {
                    console.log('Ollama started:', stdout);
                    resolve();
                }
            });
        }),
        new Promise<void>((resolve, reject) => {
            exec(`docker-compose -f "${redisCompose}" up -d`, (err, stdout, stderr) => {
                if (err) {
                    console.error('Redis docker-compose error:', err);
                    reject(err);
                } else {
                    console.log('Redis started:', stdout);
                    resolve();
                }
            });
        })
    ]);
}

function waitForTcpPort(port: number, timeout = 15000): Promise<void> {
    const net = require('net');
    const start = Date.now();
    return new Promise((resolve, reject) => {
        function check() {
            const socket = net.createConnection(port, '127.0.0.1');
            socket.on('connect', () => {
                socket.end();
                resolve();
            });
            socket.on('error', () => {
                if (Date.now() - start > timeout) {
                    reject(new Error(`Port ${port} did not open in time`));
                } else {
                    setTimeout(check, 300);
                }
            });
        }
        check();
    });
}

function startNest() {
    const nestPath = app.isPackaged
        ? path.join(process.resourcesPath, 'api-nest', 'dist', 'main.js')
        : path.join(__dirname, '..', '..', 'api-nest', 'dist', 'main.js');

    if (!fs.existsSync(nestPath)) {
        console.error(`[Nest] Not found: ${nestPath}`);
        return;
    }

    const nodePath = app.isPackaged ? process.execPath : 'node';

    // cwd must be api-nest/ (not api-nest/dist/) so ConfigModule's
    // envFilePath '../.env' resolves to the project-root .env file.
    const nestCwd = path.join(path.dirname(nestPath), '..');

    nestServer = spawn(nodePath, [nestPath], {
        cwd: nestCwd,
        env: { ...process.env, ...dotenvVars, ELECTRON_RUN_AS_NODE: '1' }
    });

    // Write server logs to a file for debugging packaged builds
    const logPath = path.join(app.getPath('userData'), 'nest-server.log');
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    logStream.write(`\n--- NestJS started ${new Date().toISOString()} ---\n`);
    logStream.write(`cwd: ${nestCwd}\n`);
    logStream.write(`nestPath: ${nestPath}\n`);

    nestServer.stdout?.on('data', (data: Buffer) => {
        console.log(`[Nest] ${data}`);
        logStream.write(`[stdout] ${data}`);
    });
    nestServer.stderr?.on('data', (data: Buffer) => {
        console.error(`[Nest] ${data}`);
        logStream.write(`[stderr] ${data}`);
    });
    nestServer.on('exit', (code) => {
        logStream.write(`[exit] code=${code}\n`);
        logStream.end();
    });

    console.log(`[Electron] NestJS logs: ${logPath}`);
}

function waitForDocker() {
    // Poll 'docker info' until Docker is running or timeout (max ~15s)
    const timeout = 15000;
    const start = Date.now();
    return new Promise<void>((resolve, reject) => {
        function check() {
            exec('docker info', (err, stdout, stderr) => {
                if (!err) {
                    resolve();
                } else if (Date.now() - start > timeout) {
                    reject(new Error('Docker is not running or not installed'));
                } else {
                    setTimeout(check, 300);
                }
            });
        }
        check();
    });
}

/** Poll localhost until the API server responds (max ~15 s). */
function waitForServer(port: string, timeout = 15000): Promise<void> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        function check() {
            const req = http.get(`http://localhost:${port}/api`, () => {
                resolve();
            });
            req.on('error', () => {
                if (Date.now() - start > timeout) {
                    reject(new Error(`[Nest] Server did not start within ${timeout}ms`));
                } else {
                    setTimeout(check, 300);
                }
            });
            req.end();
        }
        check();
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    const indexPath = app.isPackaged
        ? path.join(process.resourcesPath, 'webapp', 'dist', 'index.html')
        : path.join(__dirname, '..', '..', 'webapp', 'dist', 'index.html');

    if (fs.existsSync(indexPath)) {
        win.loadFile(indexPath);
    } else {
        console.error(`[UI] Not found: ${indexPath}`);
    }
}

app.whenReady().then(async () => {
    try {
        await waitForDocker();
        console.log('[Electron] Docker is running');
        await startDockerCompose();
        console.log('[Electron] Waiting for Ollama and Redis to be ready...');
        await Promise.all([
            waitForTcpPort(11434, 20000), // Ollama default port
            waitForTcpPort(6379, 20000)   // Redis default port
        ]);
        console.log('[Electron] Ollama and Redis are ready');
        startNest();
        await waitForServer(API_PORT);
        console.log('[Electron] NestJS server is ready');
        createWindow();
    } catch (err) {
        console.error('[Electron] Startup error:', err);
        // Show error window if Docker is not running or services failed
        const errorWin = new BrowserWindow({
            width: 600,
            height: 200,
            resizable: false,
            minimizable: false,
            maximizable: false,
            title: 'Startup Error',
            webPreferences: {
                nodeIntegration: true
            }
        });
        errorWin.loadURL('data:text/html,' +
            encodeURIComponent(`
                <body style="font-family:sans-serif;background:#fff;color:#222;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                    <div>
                        <h2>Startup Error</h2>
                        <p>Docker, Ollama, or Redis is not running or failed to start.<br>
                        Please ensure Docker Desktop is running and try again.</p>
                        <pre style="color:#c00;font-size:12px;">${err}</pre>
                    </div>
                </body>
            `)
        );
    }
});

app.on('window-all-closed', () => {
    if (nestServer) {
        nestServer.kill();
        nestServer = null;
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});