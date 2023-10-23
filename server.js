const express = require('express')
const app = express();
const jwt=require('jsonwebtoken')

const dotenv = require("dotenv");
dotenv.config();
const asyncHandler = require("express-async-handler");

const cors = require('cors');
const generateToken = require("./config/generateToken")
// const jwt=require('jsonwebtoken');
const connectDB = require('./config/db');
connectDB();
const cookieParser=require('cookie-parser')

const Chat = require('./models/chatModel');
const User = require('./models/userModel');
const Message = require('./models/messageModel');


app.use(cors({
  credentials:true,
  origin:["https://chatapp-frontend-sozu.onrender.com"]
}));
app.use(express.json());
app.use(cookieParser());

app.get('/jwt', async (req, res) => {
  // res.send("hi");{}
   try{
const cookie=req.cookies['jwt']
const claims=jwt.verify(cookie,process.env.JWT_SECRET)
// console.log(claims);
if(!claims){
  res.send({message:"Authentication failed"}
  )
}

else{
  const user=await User.findOne({
    _id:claims.id._id
  })
  // const {password,...data}=await user.toJSON()
  // console.log(user);
  res.send(user)
}

   }
catch(err){
  console.log("failed")
  return res.status(401).send({message:"Authentication failed"})
}
}
);

app.get('/logout',(req,res)=>{
  res.cookie("jwt","",{maxAge:0})
  res.send({message:"logout"});
})

app.post('/signup', asyncHandler(async (req, res) => {
  const { name, email,mobile, password } = req.body;
  if (!name || !email || !password || !mobile) {
    res.json({
      message: "Please Enter all the fields"
    });
  }
  const userExists = await User.findOne({ mobile })
  if (userExists) {
    res.json({
      message: "User already exist"
    });
  }
  const user = await User.create({
    name, email, mobile,password
  });
  if (user) {

  //  const token= generateToken(user._id)
  //  res.cookie("jwt",token,{
  //   httpOnly:true,
  //   maxAge:24*60*60*1000
  //  })

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      
    });
  }
  else {
    res.json({
      message: "Failed to create user"
    });
  }
}));

app.post('/login', asyncHandler(async (req, res) => {
  const { mobile, password } = req.body;

  const user = await User.findOne({ mobile });

  if (user && user.password == password) {

    const token= generateToken(user)
    // console.log(token);
    res.cookie("jwt",token,{
     httpOnly:true,
     maxAge:24*60*60*1000
    //  samesite:'None' ,
    //  secure:true
    })

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      //  token: token ,/
      message: "valid user"
    });
  } else {
    res.json({
      message: "Invalid Mobile or Password"
    });
  }
}));


app.post("/alluser", asyncHandler(async (req, res) => {
  const { name } = req.body;
  const user = await User.find({ name });
  res.send(user)

}));


app.post("/accesschat", asyncHandler(async (req, res) => {
  const { userId, _id } = req.body;
 console.log(req.body);
  if (!userId) {
    console.log("UserId param not sent with request");
    return res.sendStatus(400);
  }

  var isChat = await Chat.find({
    $and: [
      { users: { $elemMatch: { $eq: _id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name mobile email",
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      users: [_id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400);
    }
  }
}));



app.post("/fetchchat", asyncHandler(async (req, res) => {
  try {
    Chat.find({ users: { $elemMatch: { $eq: req.body._id } } })
      .populate("users", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name mobile email",
        });
        res.status(200).send(results);
      });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
}));

app.post("/sendmessage", asyncHandler(async (req, res) => {
  const { content, chatId, _id } = req.body;
  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: _id,
    content: content,
    chat: chatId,
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name mobile");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name mobile email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
}));


app.post("/allmessages", asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.body.chatId })
      .populate("sender", "name mobile email")
      .populate("chat");
      // console.log(messages)
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
}));

app.post("/deletemessage", asyncHandler(async (req, res) => {
  // console.log(req.body._id);
  try {
 const detail= await Message.deleteOne({_id:req.body._id})
 res.send(detail);
//  console.log(detail)
}
catch (error) {
    res.status(400);
    throw new Error(error.message);
  }

}));

app.post("/editmessage", asyncHandler(async (req, res) => {
      
      try {
   const detail=await Message.updateOne({_id:req.body._id},{$set:{content:req.body.content}})
   res.send(detail)   
  }
      catch (error) {
          res.status(400);
          throw new Error(error.message);
        }

}));



const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
    cors: { origin: "*" }
});
 const PORT = 5000;
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join chat', (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
    });

    socket.on('message', (message) => {
        // console.log(message);
        io.emit('message', `
       ${message.sender.name}:
      ${message.content}`);
    });

    socket.on('notify', (message) => {
        console.log(message);
        io.emit('notify', "notify")
    });

    // socket.on('delete', () => {
    //     // console.log(message);
    //     io.emit('message', `
    //    ${message.sender.name}:
    //   ${message.content}`);
    // });
    // socket.emit("delete","deleted")
    // socket.emit("edit","edited")

    socket.on('disconnect', () => {
        console.log('a user disconnected!');
    });
});
httpServer.listen(PORT, () => console.log(`listening on port ${PORT}`));

// app.listen(5000, console.log("server connected at port 5000"));


