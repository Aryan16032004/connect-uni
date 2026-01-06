import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActiveLocation extends Document {
    userId: mongoose.Types.ObjectId;
    location: {
        type: 'Point';
        coordinates: number[]; // [lng, lat]
    };
    lastActive: Date;
}

const ActiveLocationSchema: Schema<IActiveLocation> = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
        },
        coordinates: {
            type: [Number],
            required: true,
        },
    },
    lastActive: { type: Date, default: Date.now },
});

// Enable geospatial queries
ActiveLocationSchema.index({ location: '2dsphere' });

// TTL Index: Automatically remove documents after 5 minutes (300 seconds) of inactivity
ActiveLocationSchema.index({ lastActive: 1 }, { expireAfterSeconds: 300 });

const ActiveLocation: Model<IActiveLocation> =
    mongoose.models.ActiveLocation || mongoose.model<IActiveLocation>('ActiveLocation', ActiveLocationSchema);

export default ActiveLocation;
