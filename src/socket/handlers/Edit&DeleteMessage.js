const MessageModel = require("../../models/Message");

const editMessage = async (socket,io, data, callback) => {
  try {
    const { messageId, newMessage ,userId } = data;

    console.log("🧪 Trying to edit message with ID:", messageId);

    const message = await MessageModel.findById(messageId);
    if (!message) {
     return  callback({ success: false, error: "Message not found" });
    }
    console.log("🛠️ Edit Message Request:", data);

      // Optional: Authorize only sender to edit
    if (message.senderId.toString() !== userId) {
      return callback({ success: false, error: "Unauthorized" });
    }
  console.log(data,"newMessagetttt");
    message.message = newMessage;
    await message.save();

    io.to(message.conversationId.toString()).emit("messageEdited", message);
  
    callback({ success: true, data: message });
  } catch (err) {
    console.error("Error editing message:", err);
    callback({ success: false, error: "Edit failed" });
  }
};

const deleteMessage = async (socket, data, callback) => {
  try {
    const { messageId, userId } = data;

    const message = await MessageModel.findById(messageId);
    if (!message) {
      return callback({ success: false, error: "Message not found" });
    }
    // Debug log to help troubleshoot
    console.log("🔍 Message sender:", message.senderId.toString());
    console.log("🔍 Requesting user:", userId);
    // Optional: Check if sender is deleting their own message
    if (message.senderId.toString() !== userId) {
      return callback({ success: false, error: "Unauthorized" });
    }

    // await MessageModel.findByIdAndDelete(messageId);
    message.message = "[deleted]";
    message.deleted = true;
    await message.save();

    socket.to(message.conversationId.toString()).emit("messageDeleted", {
      messageId,
    });

    callback({ success: true });
  } catch (err) {
    console.error("Error deleting message:", err);
    callback({ success: false, error: "Delete failed" });
  }
};

module.exports = {editMessage,deleteMessage };
