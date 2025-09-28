const GarbageTopic = require('../models/topics/garbage_topics_model');
const Topic = require('../models/topics/topics_model');

module.exports = async topics => {
  const bulkOperations = topics.map(topic => ({
    updateOne: {
      filter: { topic: topic },
      update: { $inc: { count: 1 } },
      upsert: true,
    },
  }));

  await GarbageTopic.bulkWrite(bulkOperations);

  const newPopularTopics = await GarbageTopic.find({
    topic: { $in: topics },
    count: { $eq: 50 },
  });

  if (newPopularTopics.length > 0) await Topic.insertMany(newPopularTopics);

  return;
};
