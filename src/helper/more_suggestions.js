module.exports = async (Model, count) => {
  const docs = await Model.find().sort('-created_at').limit(count);
  return docs;
};
