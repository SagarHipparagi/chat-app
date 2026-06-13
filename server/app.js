require('dotenv').config();
const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// Connect DB
require('./db/connection');

// Import Files
const Users = require('./models/Users');
const Conversations = require('./models/Conversations');
const Messages = require('./models/Messages');

// app Use
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

const port = process.env.PORT || 8000;

// Socket.io
let users = [];
io.on('connection', socket => {
    console.log('User connected', socket.id);
    socket.on('addUser', userId => {
        const isUserExist = users.find(user => user.userId === userId);
        if (!isUserExist) {
            const user = { userId, socketId: socket.id };
            users.push(user);
            io.emit('getUsers', users);
        }
    });

    socket.on('sendMessage', async ({ senderId, receiverId, message, conversationId }) => {
        const receiver = users.find(user => user.userId === receiverId);
        const sender = users.find(user => user.userId === senderId);
        const user = await Users.findById(senderId);

        if (!user) {
            console.log('sendMessage: sender user not found in DB, skipping');
            return;
        }

        const userPayload = { id: user._id, fullName: user.fullName, email: user.email };
        console.log('sender :>> ', sender, receiver);

        if (receiver && sender) {
            io.to(receiver.socketId).to(sender.socketId).emit('getMessage', {
                senderId, message, conversationId, receiverId, user: userPayload
            });
        } else if (sender) {
            io.to(sender.socketId).emit('getMessage', {
                senderId, message, conversationId, receiverId, user: userPayload
            });
        }
    });

    socket.on('markAsRead', async ({ conversationId, userId }) => {
        try {
            if (conversationId === 'new') return;
            
            await Messages.updateMany(
                { conversationId, senderId: { $ne: userId }, status: { $ne: 'read' } },
                { $set: { status: 'read' } }
            );
            const conversation = await Conversations.findById(conversationId);
            if (conversation) {
                const otherMemberId = conversation.members.find(m => m !== userId);
                const otherUser = users.find(u => u.userId === otherMemberId);
                if (otherUser) {
                    io.to(otherUser.socketId).emit('messagesRead', { conversationId });
                }
            }
        } catch (error) {
            console.log('markAsRead Error:', error);
        }
    });

    socket.on('disconnect', () => {
        users = users.filter(user => user.socketId !== socket.id);
        io.emit('getUsers', users);
    });
    // io.emit('getUsers', socket.userId);
});

// Routes

app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).send('Please fill all required fields');
        }

        const isAlreadyExist = await Users.findOne({ email });
        if (isAlreadyExist) {
            return res.status(400).send('User already exists');
        }

        // Hash password properly with async/await
        const hashedPassword = await bcryptjs.hash(password, 10);
        const newUser = new Users({ fullName, email, password: hashedPassword });
        await newUser.save();

        // Auto-login: generate JWT token just like the login route
        const payload = { userId: newUser._id, email: newUser.email };
        const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'THIS_IS_A_JWT_SECRET_KEY';
        const token = await new Promise((resolve, reject) => {
            jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: 84600 }, (err, token) => {
                if (err) reject(err);
                else resolve(token);
            });
        });

        await Users.updateOne({ _id: newUser._id }, { $set: { token } });
        return res.status(200).json({
            user: { id: newUser._id, email: newUser.email, fullName: newUser.fullName },
            token
        });

    } catch (error) {
        console.log(error, 'Error');
        return res.status(500).send('Internal server error');
    }
})

app.post('/api/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).send('Please fill all required fields');
        } else {
            const user = await Users.findOne({ email });
            if (!user) {
                res.status(400).send('User email or password is incorrect');
            } else {
                const validateUser = await bcryptjs.compare(password, user.password);
                if (!validateUser) {
                    res.status(400).send('User email or password is incorrect');
                } else {
                    const payload = {
                        userId: user._id,
                        email: user.email
                    }
                    const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'THIS_IS_A_JWT_SECRET_KEY';

                    jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: 84600 }, async (err, token) => {
                        await Users.updateOne({ _id: user._id }, {
                            $set: { token }
                        })
                        user.save();
                        return res.status(200).json({ user: { id: user._id, email: user.email, fullName: user.fullName }, token: token })
                    })
                }
            }
        }

    } catch (error) {
        console.log(error, 'Error')
    }
})

app.post('/api/conversation', async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        const newCoversation = new Conversations({ members: [senderId, receiverId] });
        await newCoversation.save();
        res.status(200).send('Conversation created successfully');
    } catch (error) {
        console.log(error, 'Error')
    }
})

app.get('/api/conversations/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const conversations = await Conversations.find({ members: { $in: [userId] } });
        const conversationUserData = Promise.all(conversations.map(async (conversation) => {
            const receiverId = conversation.members.find((member) => member !== userId);
            const user = await Users.findById(receiverId);
            const unreadCount = await Messages.countDocuments({ conversationId: conversation._id, senderId: receiverId, status: { $ne: 'read' } });
            return { user: { receiverId: user._id, email: user.email, fullName: user.fullName }, conversationId: conversation._id, unreadCount }
        }))
        res.status(200).json(await conversationUserData);
    } catch (error) {
        console.log(error, 'Error')
    }
})

app.post('/api/message', async (req, res) => {
    try {
        const { conversationId, senderId, message, receiverId = '' } = req.body;
        if (!senderId || !message) return res.status(400).send('Please fill all required fields')
        const receiver = users.find(user => user.userId === receiverId);
        const status = receiver ? 'delivered' : 'sent';

        if (conversationId === 'new' && receiverId) {
            const newCoversation = new Conversations({ members: [senderId, receiverId] });
            await newCoversation.save();
            const newMessage = new Messages({ conversationId: newCoversation._id, senderId, message, status });
            await newMessage.save();
            return res.status(200).json(newMessage);
        } else if (!conversationId && !receiverId) {
            return res.status(400).send('Please fill all required fields')
        }
        const newMessage = new Messages({ conversationId, senderId, message, status });
        await newMessage.save();
        res.status(200).json(newMessage);
    } catch (error) {
        console.log(error, 'Error')
    }
})

app.get('/api/message/:conversationId', async (req, res) => {
    try {
        const checkMessages = async (conversationId) => {
            console.log(conversationId, 'conversationId')
            const messages = await Messages.find({ conversationId });
            const messageUserData = await Promise.all(messages.map(async (message) => {
                const user = await Users.findById(message.senderId);
                if (!user) return null; // skip messages from deleted users
                return { user: { id: user._id, email: user.email, fullName: user.fullName }, message: message.message, status: message.status, _id: message._id }
            }));
            res.status(200).json(messageUserData.filter(Boolean));
        }
        const conversationId = req.params.conversationId;
        if (conversationId === 'new') {
            const checkConversation = await Conversations.find({ members: { $all: [req.query.senderId, req.query.receiverId] } });
            if (checkConversation.length > 0) {
                checkMessages(checkConversation[0]._id);
            } else {
                return res.status(200).json([])
            }
        } else {
            checkMessages(conversationId);
        }
    } catch (error) {
        console.log('Error', error)
    }
})

app.get('/api/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const users = await Users.find({ _id: { $ne: userId } });
        const usersData = Promise.all(users.map(async (user) => {
            return { user: { email: user.email, fullName: user.fullName, receiverId: user._id } }
        }))
        res.status(200).json(await usersData);
    } catch (error) {
        console.log('Error', error)
    }
})

const path = require('path');
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

server.listen(port, () => {
    console.log('listening on port ' + port);
})