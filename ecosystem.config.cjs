module.exports = {
  apps: [
    {
      name: 'api-nest',
      cwd: './api-nest',
      script: 'npm.cmd',
      args: 'run start:dev',
      interpreter: 'none'
    },
    {
      name: 'webapp',
      cwd: './webapp',
      script: 'npm.cmd',
      args: 'run dev',
      interpreter: 'none'
    }
  ]
};
