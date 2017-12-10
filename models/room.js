var mongoose = require('mongoose');

var RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  create_date: {
    type: Date,
    default: Date.now,
    required: true,
  },
  last_connection: {
    type: Date,
    default: Date.now,
    required: true,
  }
});

var Room = mongoose.model('Room', RoomSchema);
module.exports = Room;

