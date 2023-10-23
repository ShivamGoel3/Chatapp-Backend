const mongoose = require("mongoose");

const chatModel = mongoose.Schema(
    {
        chatName: { type: String, trim: true },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
        latestMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "messages",
        },
    },
    { timestamps: true }
);

const Chat = mongoose.model("chats", chatModel);

module.exports = Chat;