const mongoose = require("mongoose");
const ConversationGroup = require("../../models/conversation");
const onlineUsers = require("../onlineUsers");

const handleCreateGroup = async (io, socket, { name, members = [], admins = [], type = "group" }, callback) => {
  try {
    const creatorId = admins[0]?._id || admins[0];
    const creatorObjId = new mongoose.Types.ObjectId(creatorId);

    const memberIds = members.map((m) => new mongoose.Types.ObjectId(m._id || m));
    const adminIds = admins.map((a) => new mongoose.Types.ObjectId(a._id || a));

    if (!memberIds.some((id) => id.equals(creatorObjId))) memberIds.push(creatorObjId);
    if (!adminIds.some((id) => id.equals(creatorObjId))) adminIds.push(creatorObjId);

    adminIds.forEach((adminId) => {
      if (!memberIds.some((id) => id.equals(adminId))) memberIds.push(adminId);
    });

    const newId = new mongoose.Types.ObjectId();

    const group = await ConversationGroup.create({
      _id: newId,
      name,
      type,
      status:"saved_on_server",
      members: memberIds.map((_id) => ({ _id })),
      admins: adminIds.map((_id) => ({ _id })),
      createdBy: creatorObjId,
      createdAt: new Date(),
    });

    memberIds.forEach((memberId) => {
      const sid = onlineUsers[memberId.toString()];
      if (sid) {
        io.to(sid).emit("newGroupCreated", { success: true, group });
      }
    });

    callback?.({ success: true, group });
  } catch (error) {
    console.error("❌ Group creation failed (socket):", error);
    callback?.({ success: false, error: error.message });
  }
};

const handleJoinGroup = (socket, groupId) => {
  socket.join(groupId);
  console.log(`🟦 Joined group ${groupId}`);
};

module.exports = { handleCreateGroup, handleJoinGroup };
