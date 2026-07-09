
const mongoose = require('mongoose')




const UserSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'staff', 'distributor'],
        default: 'staff',
    },
    distributorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    ProfilePic: {
        type: String


    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        default: null
    },
    isRounding: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now

    },
},
    { timestamps: true }


)

const User = mongoose.model("User", UserSchema)

module.exports = User