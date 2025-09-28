const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversations',
      required: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    text: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'delivered', 'read'],
      default: 'pending',
    },
    uuid: {
      type: String,
      required: true,
    },
    received_at: { type: Date }, // Date when the message was received
    read_at: { type: Date }, // Date when the message was read
    edited_at: { type: Date }, // Date when the message was edited
    deleted_at: { type: Date }, // Date when the message was deleted
    edited_after_received: { type: Boolean, default: false }, // Indicates if the message was edited after being received
    deleted_after_received: { type: Boolean, default: false }, // Indicates if the message was edited after being received
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    typePojo: 'Field "{PATH}" must be of type "{TYPE}"',
  },
);

MessageSchema.index({ conversation: 1 });
MessageSchema.index({ sender: 1, uuid: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('Messages', MessageSchema);
