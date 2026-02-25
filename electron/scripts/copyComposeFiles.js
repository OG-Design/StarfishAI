const fs = require('fs');
const path = require('path');

const files = [
    {
        src: path.join(__dirname, '../ollama', 'docker-compose.yml'),
        dest: path.join(__dirname, 'release', 'win-unpacked', 'resources', 'ollama', 'docker-compose.yml');
    }
    {
        src: path.join(__dirname, '../redis', 'docker-compose.yml'),
        dest: path.join(__dirname, 'release', 'win-unpacked', 'resources', 'redis', 'docker-compose.yml');
    }
];

files.forEach({src, dest} => {
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} to ${dest}`);
});