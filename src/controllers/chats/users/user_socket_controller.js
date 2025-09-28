const User = require('../../../models/users_model');
const Conversation = require('../../../models/chats/conversations_model');
const Message = require('../../../models/chats/messages_model');
const { io } = require('../../../config/app_config'); // Assuming you have configured io in app_config
const redis = require('../../../config/redis_config');
const { validate: uuidValidate } = require('uuid');
const mongoose = require('mongoose');
const _ = require('lodash');
const $ = require('../../../locales/keys');
const tr = require('../../../helper/translate');

// Function to filter and pick fields from a message object
const filterAndPickMessage = message => {
  // Check if message is a Mongoose document and convert it to plain object if true
  if (message.toObject) message = message.toObject();
  const pickFields = [
    '_id',
    'conversation',
    'sender',
    'receiver',
    'text',
    'uuid',
    'created_at',
    'updated_at',
    'received_at',
    'read_at',
    'edited_at',
    'deleted_at',
  ];
  // If conversation exists and is an object, extract its _id
  if (message.conversation && typeof message.conversation == 'object') {
    message.conversation = message.conversation._id;
  }

  return _.pick(message, pickFields);
};
//* emit messages
// Emits a 'receive-message' event to the client and handles acknowledgment
const emitReceiveMessage = (socket, message, status) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for acknowledgment'));
    }, process.env.SOCKET_ACK_TIMEOUT);
    socket.emit(
      'receive-message',
      {
        status: 'success',
        message: filterAndPickMessage({ ...message, status }),
      },
      async ack => {
        clearTimeout(timeout);
        if (ack && ack.status === 'success') {
          try {
            await Message.findByIdAndUpdate(message._id, { received_at: new Date() }).lean();
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('Message acknowledgment not received or not successful'));
        }
      },
    );
  });
};
// Emits a 'status-message' event to the client and handles acknowledgment
const emitStatus = (socket, message, status) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for status ${status} acknowledgment`));
    }, process.env.SOCKET_ACK_TIMEOUT);

    socket.emit(
      'status-message',
      {
        status: 'success',
        message: filterAndPickMessage(message),
      },
      async ack => {
        clearTimeout(timeout);
        if (ack && ack.status === 'success') {
          try {
            await Message.findByIdAndUpdate(message._id, { status }).lean();
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('Status acknowledgment not received or not successful'));
        }
      },
    );
  });
};
// Emits an 'edit-message' event to the client and handles acknowledgment
const emitEditMessage = (socket, message) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for edit message acknowledgment'));
    }, process.env.SOCKET_ACK_TIMEOUT);

    socket.emit(
      'edit-message',
      {
        status: 'success',
        message: filterAndPickMessage(message),
      },

      async ack => {
        clearTimeout(timeout);
        if (ack && ack.status === 'success') {
          try {
            await Message.findByIdAndUpdate(message._id, { edited_after_received: false }).lean();
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('acknowledgment not received or not successful'));
        }
      },
    );
  });
};

// Emits a 'remove-message' event to the client and handles acknowledgment
const emitRemoveMessage = (socket, message) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for remove message acknowledgment'));
    }, process.env.SOCKET_ACK_TIMEOUT);

    socket.emit(
      'remove-message',
      {
        status: 'success',
        message: filterAndPickMessage(message),
      },

      async ack => {
        clearTimeout(timeout);
        if (ack && ack.status === 'success') {
          try {
            await Message.findByIdAndUpdate(message._id, { deleted_after_received: false }).lean();
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('acknowledgment not received or not successful'));
        }
      },
    );
  });
};

// Retries sending a message and waits for acknowledgment
const retryAck = async (socket, message, ackFunction, ackType, status) => {
  // Maximum number of retries defined in environment variables
  let maxRetries = process.env.MAX_RETRIES;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      await ackFunction(socket, message, status); // Call the specific acknowledgment function (emit function)
      return true; // Exit the loop if successful
    } catch (error) {
      retries++;
      console.warn(`Error waiting for ${ackType}:`, error.message);
      if (retries >= maxRetries) {
        console.error(`Max retries exceeded for ${ackType}`);
        // socket.disconnect(true);
        return false;
      }
    }
  }
};

// Emits multiple messages and handles acknowledgment for each
const emitMessages = async messages => {
  let userIds = [...new Set(messages.flatMap(message => [message.sender, message.receiver]))];
  let socketIds = [];

  if (userIds && userIds.length !== 0) {
    socketIds = await redis.mGet(userIds.map(id => `${id}:socketId`));
  }
  const socketMap = new Map();
  userIds.forEach((userId, index) => {
    const socketId = socketIds[index];
    if (socketId) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socketMap.set(userId, socket);
      }
    }
  });

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    if (socketMap.has(message.receiver)) {
      const socketReceiver = socketMap.get(message.receiver);

      // Check if the user is the receiver and the message has not been received yet
      if (!message.received_at) {
        const status = await retryAck(
          socketReceiver,
          message,
          emitReceiveMessage,
          'message acknowledgment',
          'delivered',
        );
        if (status) message.received_at = new Date();
        else return;
      }

      // Check if the user is the receiver and the message has been edited after being received
      if (message.edited_after_received && message.deleted_after_received === false) {
        const status = await retryAck(
          socketReceiver,
          message,
          emitEditMessage,
          'status acknowledgment',
        );
        if (status) message.edited_after_received = false;
        else return;
      }

      // Check if the user is the receiver and the message has been deleted after being received
      if (message.deleted_after_received) {
        const status = await retryAck(
          socketReceiver,
          message,
          emitRemoveMessage,
          'status acknowledgment',
        );
        if (status) message.deleted_after_received = false;
        else return;
      }
    }

    if (socketMap.has(message.sender)) {
      const socketSender = socketMap.get(message.sender);

      if (message.received_at && message.status === 'pending') {
        // Check if the user is the sender and the message has been received but status is still pending
        const status = await retryAck(
          socketSender,
          message,
          emitStatus,
          'status acknowledgment',
          'delivered',
        );
        if (status) message.status = 'delivered';
        else return;
      }

      // Check if the user is the sender and the message has been read but status is not 'read'
      if (message.read_at && message.status !== 'read') {
        const status = await retryAck(
          socketSender,
          message,
          emitStatus,
          'status acknowledgment',
          'read',
        );
        if (status) message.status = 'read';
        else return;
      }

      console.log(`Message successfully resent: ${message._id}`);
    }
  }
};

//* connect
// Sets a user's status to 'online' and stores the socket ID in Redis
const setUserStatusOnline = async (userId, socketId) => {
  await redis.set(`${userId}:status`, 'online');
  await redis.set(`${userId}:socketId`, socketId);
};
// Retrieves all conversations for a user
const getUserConversations = async userId => {
  return await Conversation.find({
    participants: { $in: [userId] },
    deleted_by: { $ne: userId },
  })
    .populate({
      path: 'participants',
      match: { _id: { $ne: userId } },
      select: 'username profile_image background_images',
      populate: { path: 'profile_id', select: 'full_name' },
    })
    .populate({
      path: 'latest_message',
      select: 'sender receiver text delivered read sent_at',
    })
    .select('-__v')
    .lean();
};
// Joins the conversation rooms for the user
const joinUserConversationRooms = (socket, conversations) => {
  conversations.forEach(conv => {
    if (!(conv.blocked_by && conv.blocked_by.length > 0)) {
      socket.join(conv.participants[0]._id.toString());
    }
  });
};
// Adds online status to each participant in the conversations
const addOnlineStatusToParticipants = async conversations => {
  if (conversations.length == 0) return null;
  return await Promise.all(
    conversations.map(async conv => {
      const participantId = conv.participants[0]._id.toString();
      conv.participants[0].is_online = (await redis.get(`${participantId}:status`)) || 'offline';
      return conv;
    }),
  );
};
// Retrieves pending messages for a user
const getPendingMessages = async userId => {
  const messages = await Message.aggregate([
    {
      $match: {
        $or: [
          {
            receiver: new mongoose.Types.ObjectId(userId),
            $or: [
              { $and: [{ received_at: { $exists: false } }, { status: 'pending' }] },
              { edited_after_received: true },
              { deleted_after_received: true },
            ],
          },
          {
            sender: new mongoose.Types.ObjectId(userId),
            $or: [
              { $and: [{ received_at: { $exists: true } }, { status: 'pending' }] },
              { $and: [{ read_at: { $exists: true } }, { status: 'delivered' }] },
            ],
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'conversations',
        localField: 'conversation',
        foreignField: '_id',
        as: 'conversation',
      },
    },
    {
      $match: {
        $or: [
          { 'conversation.blocked_by': { $exists: false } },
          { 'conversation.blocked_by': null },
          { 'conversation.blocked_by': { $size: 0 } },
        ],
      },
    },
    {
      $project: {
        sender: 1,
        receiver: 1,
        text: 1,
        status: 1,
        uuid: 1,
        edited_after_received: 1,
        deleted_after_received: 1,
        created_at: 1,
        updated_at: 1,
        read_at: 1,
        received_at: 1,
        conversation: { $arrayElemAt: ['$conversation', 0] },
      },
    },
  ]);

  return messages;
};

// Emits a status update event to all sockets connected to a user
const emitStatusUpdate = (userId, status) => {
  io.to(userId.toString()).emit('status-update', { user_id: userId, status });
};
// Handles the connection event for a user
const handleConnection = async (socket, userId) => {
  try {
    await setUserStatusOnline(userId, socket.id);

    const conversations = await getUserConversations(userId);
    joinUserConversationRooms(socket, conversations);

    const updatedConversations = await addOnlineStatusToParticipants(conversations);
    await socket.emit('conversations', {
      status: 'success',
      conversations: updatedConversations ?? [],
    });

    const pendingMessages = await getPendingMessages(socket.user.id);
    emitStatusUpdate(userId, 'online');

    await emitMessages(pendingMessages);

    return conversations;
  } catch (error) {
    console.error(`Error in handleConnection for user ${userId}:`, error);
  }
};
//* remove conversation
// Finds the index of a conversation in an array of conversations
const findConversationIndex = (conversations, convId) => {
  return conversations.findIndex(conv => conv._id.toString() === convId);
};
// Updates a conversation to mark it as deleted by a user
const updateConversation = async (conversationId, userId) => {
  const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
  if (!conv) return tr($.not_found_skipping_removal);

  const deleted_by = conv.deleted_by;
  if (deleted_by.includes(userId)) {
    return tr($.the_conversation_has_already_been_deleted);
  }
  conv.deleted_by = [...deleted_by, userId];
  conv.save();
  return null;
};
// Removes a conversation from the array of conversations
const removeConversation = (conversations, conversationIndex) => {
  conversations.splice(conversationIndex, 1);
};
// Handles the removal of a conversation
const handleRemoveConversation = async (socket, conversationId, conversations, ack) => {
  try {
    if (typeof ack !== 'function') {
      console.log('The ack parameter must be a function');
      return;
    }
    const conversationIndex = findConversationIndex(conversations, conversationId);

    if (conversationIndex !== -1) {
      removeConversation(conversations, conversationIndex);
    }

    const updatedConversation = await updateConversation(conversationId, socket.user.id);
    if (!updatedConversation) {
      console.log(`Conversation with ID ${conversationId} removed.`);
      ack({
        status: 'success',
        conversation_id: conversationId,
      });
    } else {
      console.log(`Failed to update conversation with ID ${conversationId}.`);
      ack({
        status: 'failure',
        error: updatedConversation,
        conversation_id: conversationId,
      });
    }

    return conversations;
  } catch (error) {
    console.error(`Error in handleRemoveConversation:`, error);
    ack({
      status: 'failure',
      error: tr($.an_error_occurred_while_removing_the_conversation),
      conversation_id: conversationId,
    });
    return conversations;
  }
};
//* disconnect
// Sets a user's status to 'offline' and removes the socket ID from Redis
const setUserStatusOffline = async userId => {
  await redis.set(`${userId}:status`, 'offline');
  await redis.del(`${userId}:socketId`);
};
// Handles the disconnection event for a user
const handleDisconnect = async (socket, userId) => {
  console.log(`User ${userId} disconnected`);

  await setUserStatusOffline(userId);
  emitStatusUpdate(userId, 'offline');
};
//* handel send new message
// Stores a new message in the database and updates the conversation
const _storeMessage = async (senderId, receiverId, text, uuid, socket) => {
  // Check if there is an existing conversation between sender and receiver
  let notFoundConversation;
  let isDeletedByMe;
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });

  // If conversation is blocked, return null for conversation and message
  if (conversation && conversation.blocked_by && conversation.blocked_by.length > 1) {
    return { conversation: null, message: null };
  }

  // Check if the message with the same uuid already exists
  let message = await Message.findOne({ sender: senderId, receiver: receiverId, uuid });

  // If message already exists, return null for conversation and the existing message

  if (message) {
    return { conversation: null, message };
  }

  // If no existing conversation, create a new one
  if (!conversation) {
    conversation = new Conversation({ participants: [senderId, receiverId] });
    notFoundConversation = true;
  } else {
    // Clear deleted_by if the conversation already exists
    isDeletedByMe = conversation.deleted_by.includes(socket.user.id);
    notFoundConversation = false;
  }

  // Create a new message
  message = new Message({
    conversation: conversation._id,
    sender: senderId,
    text,
    receiver: receiverId,
    uuid,
  });

  // Save the message
  await message.save();

  // Update the latest message in the conversation and save it
  conversation.latest_message = message._id;
  conversation.deleted_by = [];

  await conversation.save();

  // Return either the new conversation or null (if it was found) and the message
  if (!notFoundConversation && !isDeletedByMe) {
    conversation = null;
  } else {
    conversation = await Conversation.findById(conversation._id)
      .populate({
        path: 'participants',
        select: 'username profile_image background_images',
        populate: { path: 'profile_id', select: 'full_name' },
      })
      .populate({
        path: 'latest_message',
        select: 'sender receiver text delivered read sent_at',
      })
      .select('-__v')
      .lean();
  }

  if (notFoundConversation || isDeletedByMe) {
    socket.join(receiverId);
    const socketReceive = io.sockets.sockets.get(await redis.get(`${receiverId}:socketId`));

    if (socketReceive) {
      await socketReceive.join(senderId);
      let ackReceive = { ...conversation };
      ackReceive.participants = ackReceive.participants.filter(
        participant => participant._id.toString() == senderId.toString(),
      );
      const ackReceiveWithIsOnline = await addOnlineStatusToParticipants([ackReceive]);
      await socketReceive.emit('new-conversation', { conversation: ackReceiveWithIsOnline });
    }
    let ackSender = { ...conversation };
    ackSender.participants = ackSender.participants.filter(
      participant => participant._id.toString() == receiverId.toString(),
    );
    const ackSenderWithIsOnline = await addOnlineStatusToParticipants([ackSender]);
    await socket.emit('new-conversation', { conversation: ackSenderWithIsOnline });
  }

  return { conversation, message: message };
};
// Validates the data of a new message
const validateMessageData = (data, userId) => {
  const { to, text, uuid } = data;
  prError(data);
  if (
    !to ||
    !text ||
    !uuid ||
    typeof to !== 'string' ||
    typeof text !== 'string' ||
    typeof uuid !== 'string' ||
    !mongoose.Types.ObjectId.isValid(to) ||
    !uuidValidate(uuid)
  ) {
    return tr($.invalid_data_received);
  }

  if (to === userId) {
    return tr($.cannot_send_message_to_yourself);
  }

  return null;
};
// Finds a receiver by their ID
const findReceiver = async to => {
  return await User.findById(to);
};
// Handles sending a new message
const handleSendNewMessage = async (socket, data, userId, ack) => {
  try {
    if (typeof ack !== 'function') {
      console.log('The ack parameter must be a function');
      return;
    }
    const validationError = validateMessageData(data, userId);
    if (validationError) {
      ack({ status: 'failure', error: validationError, data });
      return;
    }

    const { to, text, uuid } = data;
    const receiver = await findReceiver(to);
    if (!receiver) {
      ack({ status: 'failure', error: tr($.receiver_not_found), data });
      return;
    }

    const { conversation, message } = await _storeMessage(userId, receiver._id, text, uuid, socket);
    if (!message && !conversation) {
      ack({
        status: 'failure',
        error: tr(
          $.this_conversation_has_been_blocked_or_the_sent_message_has_already_been_delivered,
        ),
        data,
      });
      return;
    }

    ack({ status: 'success', message: filterAndPickMessage(message), uuid });
    await emitMessages([message.toObject()]);
    return conversation;
  } catch {
    ack({ status: 'failure', error: tr($.server_error), data });
  }
};
//* edit message
// Edits an existing message
const editMessages = async (socket, text, messageId, ack) => {
  try {
    if (typeof ack !== 'function') {
      console.log('The ack parameter must be a function');
      return;
    }
    // Find the message by its ID and sender ID
    const message = await Message.findOne({
      _id: messageId,
      sender: socket.user.id,
      deleted_at: { $exists: false },
    }).populate('conversation');

    if (!message) {
      ack({
        status: 'failure',
        error: tr($.message_not_found_or_you_are_not_the_sender),
        message_id: messageId,
      });
      return;
    }
    if (
      message.conversation &&
      message.conversation.blocked_by &&
      message.conversation.blocked_by.length > 1
    ) {
      ack({ status: 'failure', error: tr($.conversation_is_blocked), message_id: messageId });
      return;
    }
    // Update the message
    message.text = text;
    message.edited_at = new Date();
    if (message.received_at) {
      message.edited_after_received = true;
    }

    await message.save();

    // Send success acknowledgment
    ack({ status: 'success', message: filterAndPickMessage(message) });

    const receiverSocketId = await redis.get(`${message.receiver}:socketId`);
    const socketReceive = io.sockets.sockets.get(receiverSocketId);

    if (socketReceive && message.received_at) {
      await retryAck(socketReceive, message.toObject(), emitEditMessage, 'message acknowledgment');
    }
  } catch {
    ack({
      status: 'failure',
      error: 'An error occurred while editing the message',
      message_id: messageId,
    });
  }
};
//* block-conversation

// Finds and validates a conversation for blocking
const findAndValidateConversation = async (conversationId, userId) => {
  return await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    $or: [{ blocked_by: { $exists: false } }, { blocked_by: { $ne: userId } }],
  });
};
// Blocks a user in a conversation
const blockUserInConversation = async (conversation, userId) => {
  conversation.blocked_by = conversation.blocked_by || [];
  conversation.blocked_by.push(userId);
  await conversation.save();
};
// Makes users leave the rooms of a conversation
const leaveRooms = async (userId1, userId2) => {
  const userSocketId1 = await redis.get(`${userId1}:socketId`);
  const userSocketId2 = await redis.get(`${userId2}:socketId`);

  if (userSocketId1) io.sockets.sockets.get(userSocketId1)?.leave(userId2);
  if (userSocketId2) io.sockets.sockets.get(userSocketId2)?.leave(userId1);
};
// Notifies the receiver about a blocked conversation
const notifyReceiverAboutBlock = async (conversation, userId) => {
  const receiverId = conversation.participants.find(id => id.toString() !== userId.toString());
  const receiverSocketId = await redis.get(`${receiverId}:socketId`);

  if (receiverSocketId) {
    io.sockets.sockets.get(receiverSocketId)?.emit('block-conversation', {
      status: 'success',
      conversation_id: conversation._id,
    });
  }
};
// Blocks a conversation
const blockConversation = async (socket, conversationId, ack) => {
  try {
    if (typeof ack !== 'function') {
      console.log('The ack parameter must be a function');
      return;
    }
    const conversation = await findAndValidateConversation(conversationId, socket.user.id);

    if (!conversation) {
      return ack({
        status: 'failure',
        error: tr($.conversation_not_found_you_are_not_a_participant_or_already_blocked),
        conversation_id: conversationId,
      });
    }

    await blockUserInConversation(conversation, socket.user.id);
    ack({
      status: 'success',
      message: tr($.conversation_blocked_successfully),
      conversation: conversationId,
    });

    const [userId1, userId2] = conversation.participants.map(id => id.toString());

    await leaveRooms(userId1, userId2);
    await notifyReceiverAboutBlock(conversation, socket.user.id);

    return conversation;
  } catch {
    ack({
      status: 'failure',
      error: tr($.an_error_occurred_while_blocking_the_conversation),
      conversation_id: conversationId,
    });
  }
};
//* unblock-conversarion
// Finds and validates a blocked conversation
const findAndValidateBlockedConversation = async (conversationId, userId) => {
  return await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    blocked_by: userId,
  });
};
// Unblocks a user in a conversation
const unblockUserInConversation = async (conversation, userId) => {
  conversation.blocked_by = conversation.blocked_by.filter(
    blockedUserId => blockedUserId.toString() !== userId.toString(),
  );
  await conversation.save();
};
// Makes users join the rooms of a conversation
const joinRooms = async (userId1, userId2) => {
  const userSocketId1 = await redis.get(`${userId1}:socketId`);
  const userSocketId2 = await redis.get(`${userId2}:socketId`);

  if (userSocketId1) io.sockets.sockets.get(userSocketId1)?.join(userId2);
  if (userSocketId2) io.sockets.sockets.get(userSocketId2)?.join(userId1);
};
// Notifies the receiver about an unblocked conversation
const notifyReceiverAboutUnblock = async (conversation, userId) => {
  const receiverId = conversation.participants.find(id => id.toString() !== userId.toString());
  const receiverSocketId = await redis.get(`${receiverId}:socketId`);

  if (receiverSocketId) {
    io.sockets.sockets.get(receiverSocketId)?.emit('unblock-conversation', {
      status: 'success',
      message: 'Conversation successfully blocked',
      conversation_id: conversation._id,
    });
  }
};
// Unblocks a conversation
const unblockConversation = async (socket, conversationId, ack) => {
  try {
    if (typeof ack !== 'function') {
      console.log('The ack parameter must be a function');
      return;
    }

    const conversation = await findAndValidateBlockedConversation(conversationId, socket.user.id);

    if (!conversation) {
      return ack({
        status: 'failure',
        error: tr($.conversation_not_found_you_are_not_a_participant_or_not_blocked_by_you),
        conversationid: conversationId,
      });
    }

    await unblockUserInConversation(conversation, socket.user.id);
    ack({
      status: 'success',
      message: tr($.conversation_unblocked_successfully),
      conversation_id: conversation._id,
    });

    const [userId1, userId2] = conversation.participants.map(id => id.toString());
    await joinRooms(userId1, userId2);

    await notifyReceiverAboutUnblock(conversation, socket.user.id);

    return conversation;
  } catch {
    ack({
      status: 'failure',
      error: tr($.an_error_occurred_while_unblocking_the_conversation),
      conversation_id: conversationId,
    });
  }
};
//* remove-message
// Removes a message
const removeMessages = async (socket, messageId, ack) => {
  try {
    if (typeof ack !== 'function') {
      console.log('The ack parameter must be a function');
      return;
    }
    // Find the message by its ID and sender ID
    const message = await Message.findOne({
      _id: messageId,
      sender: socket.user.id,
      deleted_at: { $nin: [socket.user.id] },
    }).populate('conversation');

    if (!message) {
      // Send failure acknowledgment if the message is not found or the user is not the sender
      ack({
        status: 'failure',
        error: tr($.message_not_found_or_you_are_not_the_sender),
        message_id: messageId,
      });
      return;
    }
    if (
      message.conversation &&
      message.conversation.blocked_by &&
      message.conversation.blocked_by.length > 1
    ) {
      ack({ status: 'failure', error: tr($.conversation_is_blocked), message_id: messageId });
      return;
    }
    message.deleted_at = new Date();
    if (message.received_at) {
      message.deleted_after_received = true;
    }
    message.save();

    // Send success acknowledgment
    ack({ status: 'success', message: filterAndPickMessage(message) });

    const receiverSocketId = await redis.get(`${message.receiver}:socketId`);
    const socketReceive = io.sockets.sockets.get(receiverSocketId);

    if (socketReceive && message.received_at) {
      await retryAck(
        socketReceive,
        message.toObject(),
        emitRemoveMessage,
        'message acknowledgment',
      );
    }
  } catch (error) {
    console.log('🚀 ~ removeMessages ~ error:', error);
    // Handle any unexpected errors
    ack({
      status: 'failure',
      error: tr($.an_error_occurred_while_removing_the_message),
      message_id: messageId,
    });
  }
};
//* read-message
// Marks a message as read
const readMessages = async (messageId, socket, ack) => {
  try {
    if (typeof ack !== 'function') {
      console.log('The ack parameter must be a function');
      return;
    }

    const message = await Message.findOne({
      _id: messageId,
      deleted_at: { $exists: false },
    }).populate('conversation');

    if (!message) {
      ack({
        status: 'failure',
        message_id: messageId,
        error: tr($.invalid_message_id),
      });
      return;
    }

    if (
      message.conversation &&
      message.conversation.blocked_by &&
      message.conversation.blocked_by.length > 1
    ) {
      ack({ status: 'failure', error: tr($.conversation_is_blocked), message_id: messageId });
      return;
    }

    if (message.blocked_by && message.blocked_by.length > 0) {
      ack({ status: 'failure', error: tr($.blocked_conversation), message_id: messageId });
      return;
    }

    if (message.receiver.toString() !== socket.user._id.toString()) {
      messageId,
        ack({
          status: 'failure',
          error: tr($.you_must_),
          message_id: messageId,
        });
      return;
    }

    if (!message.received_at) {
      ack({
        status: 'failure',
        error: tr($.you_must_be_the_receiver_of_the_message),
        message_id: messageId,
      });
      return;
    }

    message.read_at = new Date();
    await message.save();
    ack({ status: 'success', message: filterAndPickMessage(message) });

    const senderSocketId = await redis.get(`${message.sender}:socketId`);
    const socketSender = io.sockets.sockets.get(senderSocketId);

    if (socketSender) {
      await retryAck(socketSender, message.toObject(), emitStatus, 'status acknowledgment', 'read');
    }
  } catch {
    ack({
      status: 'failure',
      error: tr($.an_error_occurred_while_reading_the_message),
      message_id: messageId,
    });
  }
};
//* join-conversarion
const joinConversation = async (userId, socket, ack) => {
  try {
    if (typeof ack !== 'function') {
      console.log('The ack parameter must be a function');
      return;
    }

    const conversation = await Conversation.findOne({
      participants: { $all: [userId, socket.user.id] },
      // deleted_by: { $ne: socket.user.id },
    })
      .populate({
        path: 'participants',
        match: { _id: { $eq: userId } },
        select: 'username profile_image background_images',
        populate: { path: 'profile_id', select: 'full_name' },
      })
      .populate({
        path: 'latest_message',
        select: 'sender receiver text delivered read sent_at',
      })
      .select('-__v')
      .lean();

    const convWithIsOnline = await addOnlineStatusToParticipants(
      conversation != null ? [conversation] : [],
    );

    ack({
      status: 'success',
      conversation: convWithIsOnline,
    });
  } catch (error) {
    console.log('🚀 ~ joinConversation ~ error:', error);
    ack({
      status: 'failure',
      error: tr($.an_error_occurred_while_retrieving_the_conversation),
    });
  }
};
module.exports = {
  handleConnection,
  handleRemoveConversation,
  handleSendNewMessage,
  handleDisconnect,
  readMessages,
  editMessages,
  removeMessages,
  blockConversation,
  unblockConversation,
  joinConversation,
};

function prError(data) {
  const { to, uuid, text } = data;

  // Function to log errors with emoji and formatting
  function logError(message) {
    console.error(`❌❌❌ ${message} 🤣🥴😝`);
  }

  // Validate 'to' field
  if (!to) {
    logError('"to" field is required.');
  } else if (typeof to !== 'string') {
    logError('"to" field must be a string.');
  } else if (!mongoose.Types.ObjectId.isValid(to)) {
    logError('"to" field must be a valid ObjectId.');
  }

  // Validate 'text' field
  if (!text) {
    logError('"text" field is required.');
  } else if (typeof text !== 'string') {
    logError('"text" field must be a string.');
  }

  // Validate 'uuid' field
  if (!uuid) {
    logError('"uuid" field is required.');
  } else if (typeof uuid !== 'string') {
    logError('"uuid" field must be a string.');
  } else if (!uuidValidate(uuid)) {
    logError('"uuid" field must be a valid UUID.');
  }
}
