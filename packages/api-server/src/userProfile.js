// User profile model with channel preference
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('UserProfile', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
    channel: { type: DataTypes.ENUM('whatsapp', 'sms', 'email', 'web'), defaultValue: 'whatsapp' }
  });
};
