const {
  handleCreateGroup,
  handleJoinGroup,
} = require("./handlers/groupHandler");
const {
  handleSendMessage,
  handleMarkMessagesRead,
  updateMessage,
  getAllMessagesOnServer,
  getAllMessagesOfReceiver,
  updateWithUserAlertMessage,
  getServerandUpdateReciever,
  updateMsgAsRead,
  getMsgAsRead
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

const {
  handleGetMessage,
  handleAllChatList,
  getAllConversation,
  updateConversation,
} = require("./handlers/getMessageHandler");

const { handleEditConversation, handleDeleteConversation } = require("./handlers/Edit&DeleteConversation");
const {editMessage, deleteMessage } = require("./handlers/Edit&DeleteMessage");
const onlineUsers = require("../socket/onlineUsers");

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    socket.on("joinConversation", (id) => handleJoinConversation(socket, id));
    socket.on("userOnline", (userId) => {
      console.log("✅ Got userId for online:", userId);
      handleUserOnline(socket, userId);
    });
    socket.on("join", (data) => handleJoin(socket, data));
    socket.on("joinGroup", (data) => handleJoinGroup(socket, data.groupId));
    socket.on("createGroup", (data, cb) =>
      handleCreateGroup(io, socket, data, cb)
    );
    socket.on("sendMessage", (data,callback) => handleSendMessage(io, socket, data,callback));
    socket.on("markMessagesRead", (data) => handleMarkMessagesRead(io, data));
    socket.on("markRead", (data) => handleSingleMessageRead(io, socket, data));

    // Call signaling
     socket.on("register", (userId) => {
    onlineUsers[userId] = socket.id;
    console.log("Registered:", userId, socket.id);
  });

    socket.on("startCall", (data) => handleStartCall(io, socket, data));
    socket.on("callDeclined", (data) => handleCallDeclined(io, data.toUserId));
    socket.on("joinCall", (roomId) => handleJoinCall(io, socket, roomId));
    socket.on("signal", (data) => handleSignal(io, socket, data));
    socket.on("leaveCall", (roomId) => handleLeaveCall(io, socket, roomId));

    socket.on("disconnect", () => handleDisconnect(socket));

    // Get all messages for a conversation
    socket.on("getMessages", async (data, callback) =>
      handleGetMessage(data, callback)
    );
    socket.on("getAllConversations", async (data, callback) =>
      getAllConversation(data, callback)
    );
    socket.on("updateConversation", async (data, callback) =>
      updateConversation(data, callback)
    );
    socket.on("getAllMessagesOnServer", async (data, callback) =>
      getAllMessagesOnServer(data, callback)
    );
    socket.on("getAllMessagesOfReceiver", async (data, callback) =>
      getAllMessagesOfReceiver(data, callback)
    );
    socket.on("getServerandUpdateReciever", async (data, callback) =>
      getServerandUpdateReciever(data, callback, io, socket)
    );
    socket.on("updateMsgAsRead", async (data, callback) =>
      updateMsgAsRead(data, callback, io, socket)
    );
    socket.on("getMsgAsRead", async (data ,callback) => getMsgAsRead(data,callback,io,socket))
    socket.on("updateWithUserAlertMessage", async (data, callback) =>
      updateWithUserAlertMessage(
        data.messageId,
        data.conversationId,
        data.statusOrUserId,
        callback,
        io
      )
    );
    socket.on("updateMessage", async (data, callback) =>
      updateMessage(data, callback)
    );
    socket.on("editConversation", (data, callback) =>
      handleEditConversation(io, socket, data, callback)
    );
    socket.on("deleteConversation", (data, callback) =>
      handleDeleteConversation(io, socket, data, callback)
    );

    // Get full chat list for a user
    socket.on("getChatList", (data, callback) => {
      if (typeof callback !== "function") {
        console.warn("⚠️ No callback provided in getChatList socket call");
        return;
      }
      handleAllChatList(data, callback);
    });
    socket.on("editMessage", (data, callback) => {
      editMessage(socket, io,data, callback);
    });

    socket.on("deleteMessage", (data, callback) => {
      deleteMessage(socket, data, callback);
    });


  });
  
}

module.exports = { socketHandler };
