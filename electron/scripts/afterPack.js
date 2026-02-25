module.exports = async function (context) {
    const { execSync } = require('child_process');
    execSync('npx electron-rebuild -f -w better-sqlite3', {
        cwd: context.appOutDir + '/resources/api-nest',
        stdio: 'inherit'
    });
}