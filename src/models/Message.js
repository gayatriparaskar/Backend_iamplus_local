const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  _id:{
    type:String
  },
  type:{
    type:String
  },
  conversationId: {
    type: mongoose.Schema.Types.Mixed,  // ObjectId (group) or String (1on1)
    required: true,
  },

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserDetails',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserDetails'
  },

  message: {
    type: String,
    default: '',
  },

  messageType: { 
    type: String,
    enum: ['text', 'visitor', 'checkin', 'checkout', 'task', 'note', 'file','splitMoney'],
    default: 'text'
  },

  fileUrl: { type: String },

  // ✅ Added appType for better context
  appType: {
    type: String,
    enum: ['hostel', 'shop', 'service'],
  },

  // ✅ Added flexible payload to hold any extra info (visitor, taskId, etc.)
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  seenBy: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails' },
      timestamp: { type: Date, default: Date.now },
    }
  ],

  deliveredTo: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails' },
      timestamp: { type: Date, default: Date.now },
    }
  ],

  status: {
    type: String,
    default: 'saved',
  },
  deleted: {
    type: Boolean,
    default: false,
  },

  read: { type: Boolean, default: false },

  timestamp: { type: Date, default: Date.now },

}, { timestamps: true });

const MessageModel = mongoose.model('Message', MessageSchema);

module.exports = MessageModel;