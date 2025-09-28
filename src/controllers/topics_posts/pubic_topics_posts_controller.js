const Topics = require('../../models/topics/topics_model');

/**
 * @desc    Retrieve topics based on a search term. If no search term is provided, returns [].
 * @route   POST /api/public/topics/:name
 * @access  Private (authenticated, any)
 */
exports.getAllTopics = async (req, res) => {
  if (req.params.name && req.params.name.trim().length > 0) {
    const topics = await Topics.find({ topic: { $regex: req.params.name, $options: 'i' } }).select(
      '-__v',
    );
    return res.status(200).json({ status: 'success', topics });
  }
  res.status(200).json({ status: 'success', topics: [] });
};
