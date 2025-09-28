function extendSchema(schema) {
  // Update a single document's deleted_at field by ID
  schema.statics.removeOne = function (id, filterDeveloper, callback) {
    return this.findOneAndUpdate(
      { _id: id, ...filterDeveloper },
      { $set: { deleted_at: new Date() } },
      { new: false, runValidators: true },
      callback,
    );
  };

  // Update the deleted_at field for multiple documents based on a condition
  schema.statics.removeMany = function (condition, callback) {
    return this.updateMany(
      { ...condition, deleted_at: undefined },
      { $set: { deleted_at: new Date() } },
      callback,
    );
  };

  // Find documents that are not marked as deleted
  schema.statics.findActive = function (condition, callback) {
    const activeCondition = { ...condition, deleted_at: { $exists: undefined } };
    return this.findOne(activeCondition, callback);
  };
}

module.exports = extendSchema;
