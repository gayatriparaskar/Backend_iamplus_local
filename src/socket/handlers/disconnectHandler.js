const onlineUsers = require("../onlineUsers");

const handleDisconnect = (socket) => {
  const disconnectedUserId = Object.keys(onlineUsers).find(
    (key) => onlineUsers[key] === socket.id
  );

  if (disconnectedUserId) {
    delete onlineUsers[disconnectedUserId];
    console.log(`❌ ${disconnectedUserId} disconnected`);
  }
};

module.exports = { handleDisconnect };
