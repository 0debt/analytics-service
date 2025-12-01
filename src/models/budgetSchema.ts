import { Schema, model, Document } from 'mongoose';

/** Budget document interface */
export interface IBudget extends Document {
    groupId: string;
    userId: string;
    category?: string;
    limitAmount: number;
    period: string;
    createdAt: Date;
    updatedAt: Date;
}

const budgetSchema = new Schema<IBudget>({
    groupId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    category: { type: String, required: false },
    limitAmount: { type: Number, required: true, min: 0 },
    period: { type: String, required: true },
}, { timestamps: true });

export const Budget = model<IBudget>('Budget', budgetSchema);
