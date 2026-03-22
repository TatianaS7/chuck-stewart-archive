const { db } = require('./server/db/connection');
const app = require('./server/src/app');

// Import models before syncing so Sequelize knows about them
const Print = require('./server/models/print');
const User = require('./server/models/user');
const PrintChangeLog = require('./server/models/printChangeLog');

const port = 8000;

async function init() {
    try {
        await db.sync({ alter: true });
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Error syncing database:', error);
    }
}

init();
