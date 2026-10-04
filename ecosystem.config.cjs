module.exports = {
  apps: [
    {
      name: "ejuicr",
      cwd: __dirname,
      script: "npm",
      args: "start",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
    },
  ],
};
