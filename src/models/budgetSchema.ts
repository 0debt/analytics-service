import { Schema, model } from 'mongoose';

const budgetSchema = new Schema({
    groupId: { type: String, required: true },
    category: { type: String, required: false },
    limitAmount: { type: Number, required: true },
    period: { type: String, required: true },
});

export const Budget = model('Budget', budgetSchema);

