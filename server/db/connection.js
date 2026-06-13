const mongoose = require('mongoose');

const url = "mongodb+srv://chatapphackthon:DJkumar143@cluster0.95tmhya.mongodb.net/chatapp?retryWrites=true&w=majority";

mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to DB'))
.catch((e) => console.log('Error', e));