
const mongoose = require('mongoose')




const OrderSchema= new mongoose.Schema({

    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        default: null
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    Description:{
        type:String,
        required:true,

    },
    products: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true }
    }],
    totalAmount:{
        type:Number,
        required:true,
    },
    status:{
        type:String,
        enum:["pending","shipped","delivered"],
        default: 'pending',
        required: true
    },
    isLocked: { type: Boolean, default: false },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deliveredAt: { type: Date, default: null },
    source: { type: String, enum: ['staff_request', 'admin_order'], default: 'admin_order' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    invoiceUrl:{
        type:String
    },

},
{ timestamps: true }
)

const Order=mongoose.model("Order",OrderSchema)

module.exports=Order