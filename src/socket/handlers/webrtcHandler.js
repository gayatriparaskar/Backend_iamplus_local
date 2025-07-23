// handlers/webrtcHandler.js

const users = [];

function handleOffer(socket, data) {
  socket.broadcast.emit("offer", data);
}

function handleAnswer(socket, data) {
  socket.broadcast.emit("answer", data);
}

function handleCandidate(socket, data) {
  socket.broadcast.emit("candidate", data);
}

function handleWebRTCDisconnect(socket) {
  const index = users.indexOf(socket.id);
  if (index !== -1) {
    users.splice(index, 1);
  }
  console.log("❌ WebRTC user disconnected:", socket.id);
}

function registerWebRTCUser(socket) {
  users.push(socket.id);
  console.log("✅ WebRTC user connected:", socket.id);
}

module.exports = {
  handleOffer,
  handleAnswer,
  handleCandidate,
  handleWebRTCDisconnect,
  registerWebRTCUser,
};
