const mongoose = require("mongoose");
const MessageModel = require("../../models/Message");
const ConversationGroup = require("../../models/conversation");
const onlineUsers = require("../onlineUsers");
const { sendPushNotification } = require("../../utils/sendPushNotification");

const handleSendMessage = async (io, socket, data) => {
  try {
    const {
      senderId,
      receiverId,
      message,
      messageType = "text",
      payload = {},
      conversationId,
      type,
    } = data;
    console.log(receiverId, "receiverId");
    if (!conversationId) return console.error("❌ Missing conversationId");

    let conversation = null;
    if (mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await ConversationGroup.findById(conversationId);
    } else {
      conversation = await ConversationGroup.findOne({ _id: conversationId });
    }

    if (!conversation && type === "1on1") {
      if (!receiverId) return;
      conversation = await ConversationGroup.create({
        _id: conversationId,
        type,
        members: [{ _id: senderId }, { _id: receiverId }],
        createdBy: senderId,
        createdAt: new Date(),
      });

      [senderId, receiverId].forEach((memberId) => {
        const sid = onlineUsers[memberId.toString()];
        if (sid) {
          io.to(sid).emit("newConvoCreated", { success: true, conversation });
        }
      });
    } else if (conversation && type === "1on1") {
      // ✅ Reactivate if soft-deleted
      const senderObjId = new mongoose.Types.ObjectId(senderId);

      if (conversation.deletedFor?.some((id) => id.toString() === senderId)) {
        conversation.deletedFor = conversation.deletedFor.filter(
          (id) => id.toString() !== senderId
        );
      }

      if (conversation.status === "deleted") {
        conversation.status = "saved_on_server";
      }

      await conversation.save();
    }

    let chatData = null;
    if (type === "1on1") {
      chatData = {
        type,
        senderId,
        receiverId: receiverId,
        conversationId,
        message,
        messageType,
        payload,
        timestamp: new Date(),
        read: false,
        status: "save_on_server",
      };
    } else {
      chatData = {
        type,
        senderId,
        receiverId: null,
        conversationId,
        message,
        messageType,
        payload,
        timestamp: new Date(),
        read: false,
        status: "save_on_server",
      };
    }

    const savedMsg = await MessageModel.create(chatData);

    // io.to(onlineUsers[senderId]).emit("newMessageReceived", {
    //   ...savedMsg.toObject(),
    // });

    await ConversationGroup.findByIdAndUpdate(
      conversationId,
      { lastMessage: savedMsg.toObject(), updatedAt: new Date() },
      { new: true }
    );

    const msgPayload = { ...chatData, timestamp: savedMsg.timestamp };
    io.to(conversationId).emit("newMessageReceived", savedMsg);

    let atLeastOneOnline = false;

if (Array.isArray(conversation.members)) {
  for (const member of conversation.members) {
    const memberId = member._id.toString();

    if (memberId !== senderId && onlineUsers[memberId]) {
      atLeastOneOnline = true;

      io.to(onlineUsers[memberId]).emit("newUnreadMessage", savedMsg);

      const unreadCount = await MessageModel.countDocuments({
        conversationId,
        senderId: { $ne: memberId },
        read: false,
        "seenBy.userId": { $ne: memberId },
      });

      io.to(onlineUsers[memberId]).emit("unreadCountUpdate", {
        conversationId,
        unreadCount,
      });
    }
  }
}

// ✅ Only update status if someone received it
if (atLeastOneOnline) {
  await MessageModel.findByIdAndUpdate(savedMsg._id, {
    status: "send_to_receiver",
    updatedAt: new Date()
  });
}


    if (Array.isArray(conversation.members)) {
      for (const member of conversation.members) {
        const memberId = member._id.toString();
        if (memberId !== senderId && onlineUsers[memberId]) {
          const unreadCount = await MessageModel.countDocuments({
            conversationId,
            senderId: { $ne: memberId },
            read: false,
            "seenBy.userId": { $ne: memberId },
          });

          io.to(onlineUsers[memberId]).emit("unreadCountUpdate", {
            conversationId,
            unreadCount,
          });

          // io.to(onlineUsers[senderId]).emit("messageDelivered", {
          //   messageId: savedMsg._id,
          //   to: memberId,
          //   conversationId,
          // });

          // await MessageModel.findByIdAndUpdate(savedMsg._id, {
          //   status: "received",
          // });
        }
      }
    }

    if (type === "1on1") {
      console.log(receiverId, "receiverIdddddddddddddddddddddd");
      const receiverSocketId = onlineUsers[receiverId];
      console.log(receiverSocketId, "receiverSocketId");

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newUnreadMessage", savedMsg);
      } else {
        await sendPushNotification(receiverId, {
          title: "New Message",
          body: message,
          url: `/chat/${conversationId}`,
        });
      }
    }
  } catch (err) {
    console.error("❌ Error sending message:", err);
    socket.emit("messageError", {
      message: "Failed to send message",
      code: "MESSAGE_FAILED",
    });
  }
};

const handleMarkMessagesRead = async (io, { userId, conversationId }) => {
  try {
    await MessageModel.updateMany(
      {
        conversationId,
        read: false,
        "seenBy.userId": { $ne: userId },
      },
      {
        $addToSet: { seenBy: { userId, timestamp: new Date() } },
        $set: { read: true, status: "read" },
      }
    );

    io.to(conversationId).emit("messagesReadBy", {
      from: userId,
      conversationId,
    });
  } catch (err) {
    console.error("❌ Failed to mark messages read:", err);
  }
};

const getAllMessagesOnServer = async ({ userId }, callback) => {
  try {
    const message = await MessageModel.find({
      status: "save_on_server",
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    callback({ success: true, data: message });
  } catch (err) {
    console.error("❌ Failed to save_on_server messages:", err);
    // callback({ success: false, error: "Failed to save_on_server messages" });
  }
};
const getServerandUpdateReciever = async ({ userId }, callback) => {
  try {
    // 1. Find all messages for this user where status is "save_on_server"
    console.log(userId, "userIddddddddddddddd");
    const messages = await MessageModel.find({
      receiverId: userId,
      status: "save_on_server",
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    // 2. Extract message IDs to update
    const messageIds = messages.map((msg) => msg._id);

    // 3. Update all found messages to status "received"
    await MessageModel.updateMany(
      { _id: { $in: messageIds } },
      { $set: { status: "received" } }
    );

    // 4. Return messages to callback
    callback({ success: true, data: messages });
  } catch (err) {
    console.error("❌ Failed to get or update messages:", err);
    // callback({ success: false, error: "Failed to process messages" });
  }
};
const updateMsgAsRead = async ({ userId }, callback) => {
  try {
    // 1. Find all messages for this user where status is "save_on_server"
    console.log(userId, "userIddddddddddddddd");
    const messages = await MessageModel.find({
      receiverId: userId,
      status: "received",
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
    console.log(messages, "msgggggggggggggggggggggggggggggggggggggg");
    // 2. Extract message IDs to update
    const messageIds = messages.map((msg) => msg._id);

    // 3. Update all found messages to status "received"
    await MessageModel.updateMany(
      { _id: { $in: messageIds } },
      { $set: { status: "read" } }
    );

    // 4. Return messages to callback
    callback({ success: true, data: messages });
  } catch (err) {
    console.error("❌ Failed to get or update messages:", err);
    // callback({ success: false, error: "Failed to process messages" });
  }
};

const getAllMessagesOfReceiver = async ({ userId }, callback) => {
  try {
    const message = await MessageModel.find({
      status: "received",
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    callback({ success: true, data: message });
  } catch (err) {
    console.error("❌ Failed to save_on_server messages:", err);
    // callback({ success: false, error: "Failed to save_on_server messages" });
  }
};
const updateMessage = async (messageId, conversationId, callback) => {
  try {
    let updateResult = null;
    if (mongoose.Types.ObjectId.isValid(messageId)) {
      // ✅ It's a group (ObjectId)

      console.log("grouppppppppppppppppppppppppppppppppppppppp");
      updateResult = await MessageModel.findByIdAndUpdate(
        new mongoose.Types.ObjectId(messageId),
        { status: "send_to_receiver", updatedAt: new Date() },
        { new: true }
      );
      console.log(
        "✅ Updated 1on1 conversationnnnnnnnnnnnnnnnnnnnnnnnn:",
        updateResult
      );
    } else {
      // ✅ It's a 1-on-1 (String ID)
      console.log("1111111111111111111111111111111111111111111");
      updateResult = await MessageModel.findOneAndUpdate(
        { _id: messageId },
        { status: "send_to_receiver", updatedAt: new Date() },
        { new: true }
      );
      console.log(
        "✅ Updated conversationnnnnnnnnnnnnnnnnnnnnnnnn:",
        updateResult
      );
    }

    callback({ success: true, data: updateResult });
  } catch (err) {
    console.error("❌ Failed to get chat list:", err);
    // callback({ success: false, error: "Failed to get chat list" });
  }
};

const updateWithUserAlertMessage = async (
  messageId,
  conversationId,
  status,
  callback,
  io
) => {
  try {
    console.log("🔍 Incoming messageId:", messageId);

    // Validate messageId
    // if (!messageId || typeof messageId !== "string" || !mongoose.Types.ObjectId.isValid(messageId)) {
    //   console.error("❌ Invalid messageId passed:", messageId);
    //   return callback({ success: false, error: "Invalid message ID" });
    // }

    const updateResult = await MessageModel.findByIdAndUpdate(
      messageId, // ✅ this can be string if valid ObjectId
      {
        status,
        updatedAt: new Date(),
      },
      { new: true }
    );
    console.log("✅ Message status updated:", updateResult);
    if (!updateResult) {
      return callback({ success: false, error: "Message not found" });
    }

    console.log("✅ Message status updated:", updateResult);

    const { senderId, receiverId } = updateResult;

    const senderSocketId = onlineUsers[senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageStatusUpdated", {
        messageId,
        status,
        message: updateResult,
        to: "sender",
      });
    }

    const receiverSocketId = onlineUsers[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageStatusUpdated", {
        messageId,
        status,
        message: updateResult,
        to: "receiver",
      });
    }

    callback({ success: true, data: updateResult });
  } catch (err) {
    console.error("❌ Failed to update message:", err);
    callback({ success: false, error: "Failed to update message" });
  }
};

module.exports = {
  handleSendMessage,
  handleMarkMessagesRead,
  updateMessage,
  getAllMessagesOnServer,
  getAllMessagesOfReceiver,
  getServerandUpdateReciever,
  updateWithUserAlertMessage,
  updateMsgAsRead,
};
