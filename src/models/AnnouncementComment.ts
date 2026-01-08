import mongoose, { Schema, model, models } from 'mongoose';

const AnnouncementCommentSchema = new Schema({
    announcementId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Announcement',
        required: true,
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000,
    },
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AnnouncementComment',
        default: null,
    },
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    downvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
}, { timestamps: true });

AnnouncementCommentSchema.index({ announcementId: 1, createdAt: -1 });

export const AnnouncementComment = models.AnnouncementComment || model('AnnouncementComment', AnnouncementCommentSchema);
