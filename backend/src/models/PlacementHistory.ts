import mongoose, { Schema, Document } from 'mongoose';

export interface IPlacementHistory extends Document {
  placementId: mongoose.Types.ObjectId;
  version: number;
  changedBy: mongoose.Types.ObjectId;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  timestamp: Date;
}

const PlacementHistorySchema: Schema = new Schema({
  placementId: { type: Schema.Types.ObjectId, ref: 'Placement', required: true },
  version: { type: Number, required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  changes: [{
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed }
  }],
  timestamp: { type: Date, default: Date.now }
}, { timestamps: false });

PlacementHistorySchema.index({ placementId: 1, version: -1 });

export default mongoose.model<IPlacementHistory>('PlacementHistory', PlacementHistorySchema);
