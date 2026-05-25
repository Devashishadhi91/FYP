const mongoose=require("mongoose")
const logger = require("./appLogger");


require("dotenv").config()

module.exports.MongoDBconfig=()=>{
    mongoose.connect(process.env.MONGODB_URL)
    .then(()=>{
        logger.info("connected to database successfully")
    })
    .catch((err)=>{
        logger.error("MonogoDB Connection Error",err)
    })

}
