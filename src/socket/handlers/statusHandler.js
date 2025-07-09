const onlineUsers = require("../onlineUsers");

const handleUserOnline = (socket, userId) => {
  onlineUsers[userId] = socket.id;
  console.log(`🟢 ${userId} is online`);
};

const handleJoinConversation = (socket, conversationId) => {
  socket.join(conversationId);
};

const handleJoin = (socket, { userId }) => {
  onlineUsers[userId] = socket.id;
};

module.exports = {
  handleUserOnline,
  handleJoinConversation,
  handleJoin,
};
