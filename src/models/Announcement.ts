import mongoose, { Schema, model, models } from 'mongoose';

const AnnouncementSchema = new Schema({
    title: {
        type: String,
        required: true,
        maxlength: 200,
    },
    content: {
        type: String,
        required: true,
        maxlength: 5000,
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    downvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    commentCount: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

// Index for sorting by time
AnnouncementSchema.index({ createdAt: -1 });

export const Announcement = models.Announcement || model('Announcement', AnnouncementSchema);
