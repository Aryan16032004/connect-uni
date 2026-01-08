import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
    },
    password: {
        type: String,
        select: false,
    },
    image: {
        type: String,
    },
    avatar: {
        type: String,
        default: 'boy1',
    },
    role: {
        type: String,
        enum: ['student', 'admin', 'moderator', 'superadmin'],
        default: 'student',
    },
    bio: {
        type: String,
        maxlength: [200, 'Bio cannot be more than 200 characters'],
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'away'],
        default: 'offline',
    },
    courses: [{
        type: String,
    }],
    interests: [{
        type: String,
    }],
    socialLinks: {
        linkedin: String,
        github: String,
        twitter: String,
        instagram: String,
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    friendRequests: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        type: {
            type: String,
            enum: ['sent', 'received'],
        },
        createdAt: {
            type: Date,
            default: Date.now,
        }
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    servers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Server',
    }],
    lastSeen: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default models.User || model('User', UserSchema);
