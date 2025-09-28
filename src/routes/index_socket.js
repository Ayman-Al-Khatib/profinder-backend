const { io } = require('../config/app_config'); // Assuming you have configured io in app_config
const accessControl = require('../middleware/access_control_middleware');
const socketController = require('../controllers/chats/users/user_socket_controller');

function awaitInit(ack) {
  ack({
    status: 'failure',
    message: '🔧 Please wait a moment while we set up your connection. Try again in a few seconds.',
  });
}

io.use(accessControl.protectedSocket);

io.on('connection', async socket => {
  const userId = socket.user.id;
  console.warn('🚀 ~ userId:', userId);

  socket.on('disconnect', async () => {
    await socketController.handleDisconnect(socket, userId);
  });

  let conversations;
  socketController.handleConnection(socket, userId).then(e => {
    conversations = e;
  });

  socket.on('remove-conversation', async (conversationId, ack) => {
    if (!conversations) return awaitInit(ack);
    const { _id } = conversationId;
    conversations = await socketController.handleRemoveConversation(
      socket,
      _id,
      conversations,
      ack,
    );
  });

  socket.on('send-message', async (data, ack) => {
    if (!conversations) return awaitInit(ack);
    const conv = await socketController.handleSendNewMessage(socket, data, userId, ack);
    if (conv != null) {
      conversations.push(conv);
    }
  });
  socket.on('read-message', async (data, ack) => {
    if (!conversations) return awaitInit(ack);
    const { _id } = data;
    await socketController.readMessages(_id, socket, ack);
  });
  socket.on('edit-message', async (data, ack) => {
    if (!conversations) return awaitInit(ack);
    const { _id, text } = data;
    await socketController.editMessages(socket, text, _id, ack);
  });
  socket.on('remove-message', async (data, ack) => {
    if (!conversations) return awaitInit(ack);
    const { _id } = data;
    await socketController.removeMessages(socket, _id, ack);
  });
  socket.on('block-conversation', async (data, ack) => {
    if (!conversations) return awaitInit(ack);
    const { _id } = data;
    const conversation = await socketController.blockConversation(socket, _id, ack);
    if (!conversation) return;
    const index = conversations.findIndex(
      conv => conv._id.toString() === conversation._id.toString(),
    );
    if (index !== -1) conversations[index] = conversation;
  });
  socket.on('unblock-conversation', async (data, ack) => {
    if (!conversations) return awaitInit(ack);
    const { _id } = data;
    const conversation = await socketController.unblockConversation(socket, _id, ack);
    if (!conversation) return;
    const index = conversations.findIndex(
      conv => conv._id.toString() === conversation._id.toString(),
    );
    if (index !== -1) conversations[index] = conversation;
  });

  socket.on('join-conversation', async (data, ack) => {
    console.log(typeof data);

    if (!conversations) return awaitInit(ack);
    const { _id } = data;
    await socketController.joinConversation(_id, socket, ack);
  });
});

module.exports = io;
