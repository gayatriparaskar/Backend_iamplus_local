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
    }

    const chatData = {
      type,
      senderId,
      receiverId: receiverId || null,
      conversationId,
      message,
      messageType,
      payload,
      timestamp: new Date(),
      read: false,
      status: "sent",
    };

    const savedMsg = await MessageModel.create(chatData);

    // const lastMessage = {
    //   senderId,
    //   message,
    //   messageType,
    //   payload,
    //   fileUrl: chatData.fileUrl || null,
    //   timestamp: new Date(),
    //   read: false,
    // };

    await ConversationGroup.findByIdAndUpdate(
      conversationId,
      { lastMessage:savedMsg.toObject(), updatedAt: new Date() },
      { new: true }
    );

    const msgPayload = { ...chatData, timestamp: savedMsg.timestamp };
    io.to(conversationId).emit("newMessageReceived", msgPayload);

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

          io.to(onlineUsers[senderId]).emit("messageDelivered", {
            messageId: savedMsg._id,
            to: memberId,
            conversationId,
          });

          await MessageModel.findByIdAndUpdate(savedMsg._id, {
            status: "delivered",
          });
        }
      }
    }

    if (type === "1on1") {
      const receiverSocketId = onlineUsers[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newUnreadMessage", {
          from: senderId,
          message,
          messageType,
          payload,
          conversationId,
          timestamp: savedMsg.timestamp,
        });
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

module.exports = { handleSendMessage, handleMarkMessagesRead };

