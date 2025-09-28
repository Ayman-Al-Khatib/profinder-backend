const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const topicFCMSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Users',
      index: true,
    },
    token: {
      type: String,
      required: false,
      index: true,
    },
    lang: {
      type: String,
      required: false,
    },
    topics: {
      type: [
        {
          type: String,
          unique: true,
          index: true,
        },
      ],
      default: ['users'],
    },

    last_activity: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

const TopicsFCM = mongoose.model('TokensFCM', topicFCMSchema);

module.exports = TopicsFCM;
