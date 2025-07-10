const onlineUsers = require("../onlineUsers");
const User = require("../../models/Auth"); // Add this if not already

const handleDisconnect = async (socket) => {
  const disconnectedUserId = Object.keys(onlineUsers).find(
    (key) => onlineUsers[key] === socket.id
  );

  if (disconnectedUserId) {
    delete onlineUsers[disconnectedUserId];
    console.log(`❌ ${disconnectedUserId} disconnected`);

    // 🔁 Update user in DB
    try {
      await User.findByIdAndUpdate(disconnectedUserId, {
        online_status: "offline",
        last_seen: new Date(),
      });
    } catch (err) {
      console.error("❌ Failed to update user offline status:", err);
    }
  }
};

module.exports = { handleDisconnect };
