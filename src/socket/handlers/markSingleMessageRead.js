const MessageModel = require("../../models/Message");

const handleSingleMessageRead = async (io, socket, { conversationId, messageId, userId }) => {
  try {
    await MessageModel.updateOne(
      { _id: messageId },
      {
        $addToSet: { seenBy: { userId, timestamp: new Date() } },
        $set: { read: true, status: "read" },
      }
    );

    io.to(conversationId).emit("messageRead", { messageId, userId });
  } catch (err) {
    console.error("❌ Failed to update message read status:", err);
    socket.emit("messageError", {
      message: "Failed to mark message as read",
      code: "MARK_READ_FAILED",
    });
  }
};

module.exports = handleSingleMessageRead;
