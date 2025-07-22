const onlineUsers = require("../onlineUsers");

const handleStartCall = (io, socket,data) => {
  const { fromUserId, toUserId, isVideo,roomId } = data;
  const toSocketId = onlineUsers[toUserId];
  console.log("📞 handleStartCall triggered", fromUserId, "→", toUserId, "room:", roomId);
console.log("📡 Socket ID of receiver:", toSocketId);

  if (toSocketId) {
    console.log("📡 Socket ID of receiver 22222:", toSocketId);
    io.to(toSocketId).emit("incomingCall", { fromUserId,toUserId, isVideo , roomId});
  } else {
      console.log("❌ Receiver is not registered or offline:", toUserId);
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
