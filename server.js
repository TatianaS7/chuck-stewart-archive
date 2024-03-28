const { db } = require('./server/db/connection');
const app = require('./server/src/app');
const port = 5000
async function init () {
    app.listen(port, () => {
        db.sync();
        console.log(`Listening at http://localhost:${port}`)
    })    
}

init()