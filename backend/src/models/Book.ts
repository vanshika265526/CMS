import mongoose, { Schema, Document } from 'mongoose';

export interface IBook extends Document {
  title: string;
  author: string;
  isbn: string;
  category: string;
  collegeId: mongoose.Types.ObjectId;
  totalCopies: number;
  availableCopies: number;
  location?: string;
}

const BookSchema: Schema = new Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  isbn: { type: String, required: true },
  category: { type: String, required: true },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  totalCopies: { type: Number, required: true },
  availableCopies: { type: Number, required: true },
  location: { type: String },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

BookSchema.index({ isbn: 1, collegeId: 1 }, { unique: true });

// Soft-delete: auto-exclude isDeleted records from find and countDocuments
BookSchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});
BookSchema.pre('countDocuments', function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});

export default mongoose.model<IBook>('Book', BookSchema);
