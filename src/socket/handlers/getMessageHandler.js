const MessageModel = require("../../models/Message");
const ConversationGroup = require("../../models/conversation");
const User = require("../../models/User"); // required for chat list

// Get all messages for a conversation
socket.on("getMessages", async ({ conversationId }, callback) => {
  try {
    const messages = await MessageModel.find({ conversationId }).sort({
      createdAt: 1,
    });

    const enriched = messages.map((msg) => ({
      ...msg._doc,
      status: msg.read ? "read" : "delivered",
    }));

    callback({ success: true, data: enriched });
  } catch (err) {
    console.error("❌ Failed to fetch messages:", err);
    callback({ success: false, error: "Failed to fetch messages" });
  }
});

// Get full chat list for a user
socket.on("getChatList", async ({ userId }, callback) => {
  try {
    const conversations = await ConversationGroup.find({
      "members._id": userId,
    })
      .sort({ updatedAt: -1 })
      .limit(50);

    const formatted = await Promise.all(
      conversations.map(async (convo) => {
        const unreadCount = await MessageModel.countDocuments({
          conversationId: convo._id,
          read: false,
          senderId: { $ne: userId },
          "seenBy.userId": { $ne: userId },
        });

        const lastMsgRead = await MessageModel.findOne({
          conversationId: convo._id,
        }).sort({ timestamp: -1 });

        const enrichedLastMsg = lastMsgRead
          ? {
              ...lastMsgRead._doc,
              status: lastMsgRead.read ? "read" : "delivered",
            }
          : null;

        // fallback logic
        const safeLastMsg =
          convo.lastMessage?.message?.length > 0
            ? convo.lastMessage
            : enrichedLastMsg;

        if (convo.type === "1on1") {
          const otherUser = convo.members.find(
            (m) => m._id.toString() !== userId
          );

          let userDetails = null;
          if (otherUser && otherUser._id) {
            userDetails = await User.findById(otherUser._id).select(
              "userName phone_number online_status last_seen"
            );
          }

          return {
            _id: convo._id,
            type: "1on1",
            user: {
              _id: otherUser?._id,
              userName: userDetails?.userName || null,
              phone_number: userDetails?.phone_number || null,
            },
            lastMsg: safeLastMsg || null,
            lastMsgAt: convo.updatedAt,
            unreadCount,
            lastMsgRead: enrichedLastMsg,
            online_status: userDetails?.online_status || "offline",
            last_seen: userDetails?.last_seen || null,
          };
        } else {
          // group chat
          return {
            _id: convo._id,
            type: "group",
            user: {
              userName: convo.name,
              image: convo.image,
              location: convo.location,
              members: convo.members,
              admins: convo.admins,
              createdBy: convo.createdBy,
            },
            lastMsg: safeLastMsg || null,
            lastMsgAt: convo.updatedAt,
            unreadCount,
            lastMsgRead: enrichedLastMsg,
          };
        }
      })
    );

    formatted.sort((a, b) => new Date(b.lastMsgAt) - new Date(a.lastMsgAt));

    callback({ success: true, data: formatted });
  } catch (err) {
    console.error("❌ Failed to get chat list:", err);
    callback({ success: false, error: "Failed to get chat list" });
  }
});
