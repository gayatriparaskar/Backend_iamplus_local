const MessageModel = require("../../models/Message");
const ConversationGroup = require("../../models/conversation");
const User = require("../../models/Auth"); // required for chat list
const onlineUsers = require("../onlineUsers");
const mongoose = require("mongoose");
// Get all messages for a conversation
const handleGetMessage = async ({ conversationId }, callback) => {
  try {
    const messages = await MessageModel.find({ conversationId }).sort({
      createdAt: 1,
    });

    const enriched = messages.map((msg) => ({
      ...msg._doc,
      status: msg.read ? "read" : "delivered",clearImmediate
    }));

    callback({ success: true, data: enriched });
  } catch (err) {
    console.error("❌ Failed to fetch messages:", err);
    callback({ success: false, error: "Failed to fetch messages" });
  }
}

// Get full chat list for a user
const handleAllChatList = async ({ userId }, callback) => {
  try {
    const conversations = await ConversationGroup.find({
      "members._id": userId,
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

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

        // Enrich message-level status inside lastMessage
        if (convo.lastMessage) {
          convo.lastMessage.status = convo.lastMessage.read ? "read" : "delivered";
        }

        convo.unreadCount = unreadCount;
        convo.lastMsgRead = lastMsgRead || null;

        let status = "";

        if (convo.type === "1on1") {
          const otherUser = convo.members.find(
            (m) => m._id.toString() !== userId
          );

          let userDetails = null;
          if (otherUser && otherUser._id) {
            userDetails = await User.findById(otherUser._id).select(
              "userName phone_number online_status last_seen"
            ).lean();
          }

          const isReceiverOnline = !!onlineUsers[otherUser?._id.toString()];
          convo.user = {
            _id: otherUser?._id,
            userName: userDetails?.userName || null,
            phone_number: userDetails?.phone_number || null,
          };
          convo.online_status = isReceiverOnline ? "online" : "offline";
          convo.last_seen = userDetails?.last_seen || null;

          if (convo.lastMessage) {
            const isDelivered = convo.lastMessage.status === "delivered" || convo.lastMessage.status === "read";

            if (isDelivered) {
              status = "send_to_receiver";
            } else if (isReceiverOnline) {
              status = "saved_to_server";
            } else {
              status = "saved";
            }
          }
        } else {
          // ✅ GROUP CHAT STATUS LOGIC
          const memberIds = convo.members.map((m) => m._id.toString());
          const otherMemberIds = memberIds.filter((id) => id !== userId);

          const onlineMemberCount = otherMemberIds.filter(
            (id) => !!onlineUsers[id]
          ).length;

          let deliveredToSomeone = false;

          if (convo.lastMessage) {
            const messageDoc = await MessageModel.findById(convo.lastMessage._id).lean();
            if (messageDoc && messageDoc.seenBy) {
              deliveredToSomeone = messageDoc.seenBy.some(
                (entry) => otherMemberIds.includes(entry.userId.toString())
              );
            }
          }

          if (deliveredToSomeone) {
            status = "send_to_receiver";
          } else if (onlineMemberCount > 0) {
            status = "saved_to_server";
          } else {
            status = "saved";
          }

          convo.user = {
            userName: convo.name,
            image: convo.image,
            location: convo.location,
            members: convo.members,
            admins: convo.admins,
            createdBy: convo.createdBy,
          };
        }

        if (status) {
          convo.status = status;
        }

        return convo;
      })
    );

    callback({ success: true , data:formatted});
  } catch (err) {
    console.error("❌ Failed to get chat list:", err);
    callback({ success: false, error: "Failed to get chat list" });
  }
};

// Get full chat list for a user
const getAllConversation = async ( {userId} , callback) => {
  try {
    const conversations = await ConversationGroup.find({
      "members._id": userId,
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();


    callback({ success: true , data:conversations });
  } catch (err) {
    console.error("❌ Failed to get chat list:", err);
    callback({ success: false, error: "Failed to get chat list" });
  }
};
const updateConversation = async ( conversationId , callback) => {
  try {
    let updateResult=null;
    if (mongoose.Types.ObjectId.isValid(conversationId)) {
            // ✅ It's a group (ObjectId)

            console.log("grouppppppppppppppppppppppppppppppppppppppp");
            updateResult = await ConversationGroup.findByIdAndUpdate(
              new mongoose.Types.ObjectId(conversationId),
              { status:"send_to_receiver", updatedAt: new Date() },
              { new: true }
            );
            console.log(
              "✅ Updated 1on1 conversationnnnnnnnnnnnnnnnnnnnnnnnn:",
              updateResult
            );
          } else {
            // ✅ It's a 1-on-1 (String ID)
            console.log("1111111111111111111111111111111111111111111");
            updateResult = await ConversationGroup.findOneAndUpdate(
              { _id: conversationId },
              { status:"send_to_receiver", updatedAt: new Date() },
              { new: true }
            );
            console.log(
              "✅ Updated conversationnnnnnnnnnnnnnnnnnnnnnnnn:",
              updateResult
            );
          }

    callback({ success: true , data:updateResult });
  } catch (err) {
    console.error("❌ Failed to get chat list:", err);
    callback({ success: false, error: "Failed to get chat list" });
  }
};



module.exports = {handleGetMessage,handleAllChatList,getAllConversation,updateConversation}
