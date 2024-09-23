const { db } = require('./server/db/connection');
const app = require('./server/src/app');
const port = 8000;

async function init() {
    try {
        await db.sync();
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Error syncing database:', error);
    }
}

init();
