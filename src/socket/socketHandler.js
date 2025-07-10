const {
  handleCreateGroup,
  handleJoinGroup,
} = require("./handlers/groupHandler");
const {
  handleSendMessage,
  handleMarkMessagesRead,
} = require("./handlers/messageHandler");
const {
  handleUserOnline,
  handleJoinConversation,
  handleJoin,
} = require("./handlers/statusHandler");
const {
  handleStartCall,
  handleCallDeclined,
  handleJoinCall,
  handleSignal,
  handleLeaveCall,
} = require("./handlers/callHandler");
const { handleDisconnect } = require("./handlers/disconnectHandler");
const handleSingleMessageRead = require("./handlers/markSingleMessageRead");

const { handleGetMessage, handleAllChatList,getAllConversation,updateConversation} = require("./handlers/getMessageHandler");

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    socket.on("joinConversation", (id) => handleJoinConversation(socket, id));
    socket.on("userOnline", (userId) => {
      console.log("✅ Got userId for online:", userId);
      handleUserOnline(socket, userId)});
    socket.on("join", (data) => handleJoin(socket, data));
    socket.on("joinGroup", (data) => handleJoinGroup(socket, data.groupId));
    socket.on("createGroup", (data, cb) => handleCreateGroup(io, socket, data, cb));
    socket.on("sendMessage", (data) => handleSendMessage(io, socket, data));
    socket.on("markMessagesRead", (data) => handleMarkMessagesRead(io, data));
    socket.on("markRead", (data) => handleSingleMessageRead(io, socket, data));

    // Call signaling
    socket.on("startCall", (data) => handleStartCall(io, socket, data));
    socket.on("callDeclined", (data) => handleCallDeclined(io, data.toUserId));
    socket.on("joinCall", (roomId) => handleJoinCall(io, socket, roomId));
    socket.on("signal", (data) => handleSignal(io, socket, data));
    socket.on("leaveCall", (roomId) => handleLeaveCall(io, socket, roomId));

    socket.on("disconnect", () => handleDisconnect(socket));

// Get all messages for a conversation
socket.on("getMessages", async (data, callback) => handleGetMessage(data,callback))
socket.on("getAllConversations", async (data, callback) => getAllConversation(data,callback))
socket.on("updateConversation", async (data, callback) => updateConversation(data,callback))

// Get full chat list for a user
socket.on("getChatList", (data, callback) => {
   if (typeof callback !== "function") {
    console.warn("⚠️ No callback provided in getChatList socket call");
    return;
  }
  handleAllChatList(data, callback);
});

  });
}

module.exports = { socketHandler };
