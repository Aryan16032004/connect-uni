import mongoose, { Schema, model, models } from "mongoose";

const DirectMessageSchema = new Schema({
    content: {
        type: String,
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    attachments: [{
        type: String // URLs
    }],
    reactions: [{
        emoji: String,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DirectMessage",
    },
    edited: {
        type: Boolean,
        default: false,
    },
    deleted: {
        type: Boolean,
        default: false
    },
    readBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        readAt: {
            type: Date,
            default: Date.now,
        },
    }],
}, { timestamps: true });

export const DirectMessage = models.DirectMessage || model("DirectMessage", DirectMessageSchema);
