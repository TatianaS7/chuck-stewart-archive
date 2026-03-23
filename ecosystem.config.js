module.exports = {
    apps: [{
        name: 'chuck-stewart-archive',
        script: './server/src/app.js',
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        // Auto restart if memory exceeds 500MB
        max_memory_restart: '500M',
        // Keep crash logs
        error_file: './logs/err.log',
        out_file: './logs/out.log',
    }]
};