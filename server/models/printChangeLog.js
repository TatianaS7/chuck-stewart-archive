const { db, Model, DataTypes } = require("../db/connection");

class PrintChangeLog extends Model {}

PrintChangeLog.init(
  {
    action: {
      type: DataTypes.ENUM,
      values: ["CREATE", "UPDATE", "DELETE"],
      allowNull: false,
    },
    print_catalog_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    changed_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: "PrintChangeLog",
  },
);

module.exports = PrintChangeLog;
