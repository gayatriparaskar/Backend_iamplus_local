const onlineUsers = require("../onlineUsers");

const handleStartCall = (io, socket, { fromUserId, toUserId, isVideo }) => {
  const toSocketId = onlineUsers[toUserId];
  if (toSocketId) {
    io.to(toSocketId).emit("incomingCall", { fromUserId, isVideo });
  } else {
    socket.emit("userOffline", { toUserId });
  }
};

const handleCallDeclined = (io, toUserId) => {
  const toSocketId = onlineUsers[toUserId];
  if (toSocketId) {
    io.to(toSocketId).emit("callDeclined");
  }
};

const handleJoinCall = (io, socket, roomId) => {
  socket.join(roomId);
  socket.to(roomId).emit("user-joined-call", socket.id);
};

const handleSignal = (io, socket, { roomId, data, to }) => {
  io.to(to).emit("signal", { from: socket.id, data });
};

const handleLeaveCall = (io, socket, roomId) => {
  socket.leave(roomId);
  socket.to(roomId).emit("user-left-call", socket.id);
};

module.exports = {
  handleStartCall,
  handleCallDeclined,
  handleJoinCall,
  handleSignal,
  handleLeaveCall,
};
