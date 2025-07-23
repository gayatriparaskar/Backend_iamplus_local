const onlineUsers = require("../onlineUsers");
const User = require("../../models/Auth");
const handleUserOnline = async (socket, userId) => {
  try {
      console.log("📡 Registering online user:", userId, "socket:", socket.id);
      onlineUsers[userId] = socket.id;
      console.log(`🟢 ${userId} is online`);
    await User.findByIdAndUpdate(userId, { online_status: "online" ,last_seen:new Date(),});
    console.log(`✅ User ${userId} marked as online`);
  } catch (err) {
    console.error("❌ Failed to update online status:", err);
  }
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
