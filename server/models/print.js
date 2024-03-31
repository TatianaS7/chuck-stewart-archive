const { db, Model, DataTypes } = require('../db/connection');

class Print extends Model {};

Print.init({
    "status": {
        type: DataTypes.ENUM,
        values: ["Available", "Sold", "Unavailable"],
        defaultValue: 'Available',
        allowNull: false
    },
    "catalog_number": {
        type: DataTypes.STRING,
        allowNull: false
    },
    "artist": {
        type: DataTypes.STRING,
        allowNull: false
    },
    "image": {
        type: DataTypes.STRING,
        allowNull: true
    },
    "date": {
        type: DataTypes.STRING,
        allowNull: true
    },
    "size": {
        type: DataTypes.ENUM,
        values: ["11x14", "16x20", "11x14C"],
        allowNull: false
    },
    "location": {
        type: DataTypes.STRING,
        allowNull: true
    },
    "instrument": {
        type: DataTypes.STRING,
        allowNull: true
    },
    "notes": {
        type: DataTypes.STRING,
        allowNull: true
    },
    "date_sold": {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize: db,
    modelName: "Print"
});


module.exports = Print;


