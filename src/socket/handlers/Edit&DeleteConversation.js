const mongoose = require("mongoose");
const ConversationGroup = require("../../models/conversation");

const handleEditConversation = async (io, socket, { conversationId, updates }, callback) => {
  try {
    const convo = await ConversationGroup.findById(conversationId);
    if (!convo) return callback?.({ success: false, error: "Conversation not found" });

    if (updates.name) convo.name = updates.name;
    if (updates.image) convo.image = updates.image;

    // Convert all IDs to ObjectId
    const toObjId = (id) => new mongoose.Types.ObjectId(id);

    // Update members
    if (updates.membersToAdd) {
      updates.membersToAdd.forEach((id) => {
        const exists = convo.members.find(m => m._id.toString() === id);
        if (!exists) convo.members.push({ _id: toObjId(id) });
      });
    }

    if (updates.membersToRemove) {
      convo.members = convo.members.filter(m => !updates.membersToRemove.includes(m._id.toString()));
    }

    // Update admins
    if (updates.adminsToAdd) {
      updates.adminsToAdd.forEach((id) => {
        const objId = toObjId(id);
        if (!convo.admins.find(a => a.toString() === objId.toString())) {
          convo.admins.push(objId);
        }
      });
    }

    if (updates.adminsToRemove) {
      convo.admins = convo.admins.filter(a => !updates.adminsToRemove.includes(a.toString()));
    }

    await convo.save();

    // Broadcast update to all group members
    io.to(conversationId).emit("conversationUpdated", convo);
    callback?.({ success: true, data: convo });
  } catch (err) {
    console.error("❌ Conversation update failed (socket):", err);
    callback?.({ success: false, error: err.message });
  }
};

const handleDeleteConversation = async (
  io,
  socket,
  { conversationId, userId },
  callback
) => {
  try {
    const convo = await ConversationGroup.findById(conversationId);
    if (!convo)
      return callback?.({ success: false, error: "Conversation not found" });

    const objectUserId = new mongoose.Types.ObjectId(userId);

    if (convo.type === "group") {
      // ✅ Only allow admin/creator to delete group
      const isAdmin = convo.admins.some((a) => a.toString() === userId);
      const isCreator = convo.createdBy?.toString() === userId;

      if (!isAdmin && !isCreator) {
        return callback?.({
          success: false,
          error: "Not authorized to delete group",
        });
      }

      convo.status = "deleted"; // soft delete for all
      await convo.save();

      io.to(conversationId).emit("conversationDeleted", { conversationId });

      // Remove all sockets from this group
      const room = io.sockets.adapter.rooms.get(conversationId);
      if (room) {
        room.forEach((socketId) => {
          const clientSocket = io.sockets.sockets.get(socketId);
          if (clientSocket) clientSocket.leave(conversationId);
        });
      }

      console.log(`🗑️ Group ${conversationId} deleted by ${userId}`);
    } else {
      // ✅ For 1on1 chat: soft delete only for current user
      if (!convo.deletedFor.includes(objectUserId)) {
        convo.deletedFor.push(objectUserId);

        // Check if both users have deleted
        const allUserIds = convo.members.map((m) => m._id.toString());
        const deletedUserIds = convo.deletedFor.map((d) => d.toString());

        const allDeleted = allUserIds.every((id) =>
          deletedUserIds.includes(id)
        );
        if (allDeleted) {
          convo.status = "deleted"; // only mark deleted if both removed
        }

        await convo.save();
        console.log(
          `🗑️ Conversation ${conversationId} soft-deleted for user ${userId}`
        );
      }
    }

    callback?.({ success: true });
  } catch (err) {
    console.error("❌ Conversation delete failed (socket):", err);
    callback?.({ success: false, error: err.message });
  }
};
module.exports = { handleEditConversation, handleDeleteConversation };
