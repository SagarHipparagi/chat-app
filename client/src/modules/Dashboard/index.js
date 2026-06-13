import { useEffect, useRef, useState } from 'react'
import Input from '../../components/Input'
import Avatar from '../../components/Avatar'
import { io } from 'socket.io-client'

const Dashboard = () => {
	const [user, setUser] = useState(JSON.parse(localStorage.getItem('user:detail')))
	const [conversations, setConversations] = useState([])
	const [messages, setMessages] = useState({})
	const [message, setMessage] = useState('')
	const [users, setUsers] = useState([])
	const [activeUsers, setActiveUsers] = useState([])
	const [socket, setSocket] = useState(null)
	const messageRef = useRef(null)

	useEffect(() => {
		const backendUrl = window.location.origin.includes('localhost') ? 'http://localhost:8000' : '';
		setSocket(io(backendUrl))
	}, [])

	useEffect(() => {
		socket?.emit('addUser', user?.id);
		socket?.on('getUsers', users => {
			setActiveUsers(users);
		})
		socket?.on('getMessage', data => {
            if (data.user?.id !== user?.id) {
                setMessages(prev => {
                    if (prev.conversationId === data.conversationId) {
                        return {
                            ...prev,
                            messages: [...prev.messages, { user: data.user, message: data.message, status: 'delivered' }]
                        }
                    }
                    return prev;
                })

                setConversations(prevConvs => {
                    return prevConvs.map(conv => {
                        if (conv.conversationId === data.conversationId) {
                            return { ...conv, unreadCount: (conv.unreadCount || 0) + 1 }
                        }
                        return conv;
                    })
                });
            }
		})
        socket?.on('messagesRead', ({ conversationId }) => {
            setMessages(prev => {
                if (prev.conversationId === conversationId) {
                    return {
                        ...prev,
                        messages: prev.messages.map(m => m.user?.id === user?.id ? { ...m, status: 'read' } : m)
                    }
                }
                return prev;
            });
        });
	}, [socket])

	useEffect(() => {
		messageRef?.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages?.messages])

	useEffect(() => {
		const loggedInUser = JSON.parse(localStorage.getItem('user:detail'))
		const fetchConversations = async () => {
			const res = await fetch(`/api/conversations/${loggedInUser?.id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				}
			});
			const resData = await res.json()
			setConversations(resData)
		}
		fetchConversations()
	}, [])

	useEffect(() => {
		const fetchUsers = async () => {
			const res = await fetch(`/api/users/${user?.id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				}
			});
			const resData = await res.json()
			setUsers(resData)
		}
		fetchUsers()
	}, [])

	const fetchMessages = async (conversationId, receiver) => {
		try {
			const res = await fetch(`/api/message/${conversationId}?senderId=${user?.id}&receiverId=${receiver?.receiverId}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				}
			});
			const resData = await res.json()
			setMessages({ messages: resData, receiver, conversationId })
            socket?.emit('markAsRead', { conversationId, userId: user?.id });
            setConversations(prevConvs => prevConvs.map(conv => 
                conv.conversationId === conversationId ? { ...conv, unreadCount: 0 } : conv
            ));
		} catch(err) {
			console.error('fetchMessages error:', err)
		}
	}

	const sendMessage = async (e) => {
		setMessage('')
		socket?.emit('sendMessage', {
			senderId: user?.id,
			receiverId: messages?.receiver?.receiverId,
			message,
			conversationId: messages?.conversationId
		});
		const res = await fetch(`/api/message`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				conversationId: messages?.conversationId,
				senderId: user?.id,
				message,
				receiverId: messages?.receiver?.receiverId
			})
		});
        const newMessage = await res.json();
        setMessages(prev => ({
            ...prev,
            messages: [...prev.messages, { user: { id: user?.id }, message, status: newMessage.status, _id: newMessage._id }]
        }));
	}

	const handleLogout = () => {
		localStorage.removeItem('user:token')
		localStorage.removeItem('user:detail')
		window.location.href = '/users/sign_in'
	}

    const TickIcon = ({ status }) => {
        if (status === 'read') return <span className="text-teal-300 ml-2 text-xs font-bold tracking-tighter">✓✓</span>;
        if (status === 'delivered') return <span className="text-white/70 ml-2 text-xs font-bold tracking-tighter">✓✓</span>;
        return <span className="text-white/70 ml-2 text-xs font-bold">✓</span>;
    }

	return (
		<div className='w-screen flex'>
			<div className='w-[25%] h-screen bg-secondary overflow-scroll'>
				<div className='flex items-center my-8 mx-14'>
					<div><Avatar name={user?.fullName} size={75} className='p-[2px]' /></div>
					<div className='ml-8'>
						<h3 className='text-2xl'>{user?.fullName}</h3>
						<p className='text-lg font-light'>My Account</p>
					</div>
				</div>
				<div className='mx-14 mb-6'>
					<button
						onClick={handleLogout}
						className='w-full text-sm text-white bg-red-500 hover:bg-red-600 py-2 px-4 rounded-lg'
					>
						Logout
					</button>
				</div>
				<hr />
				<div className='mx-14 mt-10'>
					<div className='text-primary text-lg'>Messages</div>
					<div>
						{
							conversations.length > 0 ?
								conversations.map(({ conversationId, user, unreadCount }) => {
									return (
										<div className='flex items-center py-8 border-b border-b-gray-300'>
											<div className='cursor-pointer flex items-center w-full' onClick={() => fetchMessages(conversationId, user)}>
												<div><Avatar name={user?.fullName} size={60} /></div>
												<div className='ml-6 flex-1'>
													<h3 className='text-lg font-semibold flex items-center'>
                                                        {user?.fullName}
                                                        {activeUsers.some(u => u.userId === user?.receiverId) && <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>}
                                                    </h3>
													<p className='text-sm font-light text-gray-600'>{user?.email}</p>
												</div>
                                                {unreadCount > 0 && (
                                                    <div className='ml-auto bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mr-4'>
                                                        {unreadCount}
                                                    </div>
                                                )}
											</div>
										</div>
									)
								}) : <div className='text-center text-lg font-semibold mt-24'>No Conversations</div>
						}
					</div>
				</div>
			</div>
			<div className='w-[50%] h-screen bg-white flex flex-col items-center'>
				{
					messages?.receiver?.fullName &&
					<div className='w-[75%] bg-secondary h-[80px] my-14 rounded-full flex items-center px-14 py-2'>
						<div className='cursor-pointer'><Avatar name={messages?.receiver?.fullName} size={60} /></div>
						<div className='ml-6 mr-auto'>
							<h3 className='text-lg'>{messages?.receiver?.fullName}</h3>
							<p className='text-sm font-light text-gray-600'>{messages?.receiver?.email}</p>
                            {activeUsers.some(u => u.userId === messages?.receiver?.receiverId) && (
                                <p className='text-xs font-semibold text-green-500'>Online</p>
                            )}
						</div>

					</div>
				}
				<div className='h-[75%] w-full overflow-scroll shadow-sm'>
					<div className='p-14'>
						{
							messages?.messages?.length > 0 ?
								messages.messages.map((msgObj, index) => {
                                    const { message, user: { id } = {}, status } = msgObj;
									return (
										<div key={index}>
										<div className={`max-w-[40%] rounded-b-xl p-4 mb-6 ${id === user?.id ? 'bg-primary text-white rounded-tl-xl ml-auto' : 'bg-secondary rounded-tr-xl'} `}>
                                            {message}
                                            {id === user?.id && <TickIcon status={status} />}
                                        </div>
										<div ref={messageRef}></div>
										</div>
									)
								}) : <div className='text-center text-lg font-semibold mt-24'>No Messages or No Conversation Selected</div>
						}
					</div>
				</div>
				{
					messages?.receiver?.fullName &&
					<div className='p-14 w-full flex items-center'>
						<Input placeholder='Type a message...' value={message} onChange={(e) => setMessage(e.target.value)} className='w-[75%]' inputClassName='p-4 border-0 shadow-md rounded-full bg-light focus:ring-0 focus:border-0 outline-none' />
						<div className={`ml-4 p-2 cursor-pointer bg-light rounded-full ${!message && 'pointer-events-none'}`} onClick={() => sendMessage()}>
							<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-send" width="30" height="30" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
								<path stroke="none" d="M0 0h24v24H0z" fill="none" />
								<line x1="10" y1="14" x2="21" y2="3" />
								<path d="M21 3l-6.5 18a0.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a0.55 .55 0 0 1 0 -1l18 -6.5" />
							</svg>
						</div>
						<div className={`ml-4 p-2 cursor-pointer bg-light rounded-full ${!message && 'pointer-events-none'}`}>
							<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-circle-plus" width="30" height="30" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
								<path stroke="none" d="M0 0h24v24H0z" fill="none" />
								<circle cx="12" cy="12" r="9" />
								<line x1="9" y1="12" x2="15" y2="12" />
								<line x1="12" y1="9" x2="12" y2="15" />
							</svg>
						</div>
					</div>
				}
			</div>
			<div className='w-[25%] h-screen bg-light px-8 py-16 overflow-scroll'>
				<div className='text-primary text-lg'>People</div>
				<div>
					{
						users.length > 0 ?
							users.map(({ userId, user }) => {
								return (
									<div className='flex items-center py-8 border-b border-b-gray-300'>
										<div className='cursor-pointer flex items-center' onClick={() => fetchMessages('new', user)}>
											<div><Avatar name={user?.fullName} size={60} /></div>
											<div className='ml-6'>
												<h3 className='text-lg font-semibold flex items-center'>
                                                    {user?.fullName}
                                                    {activeUsers.some(u => u.userId === user?.receiverId) && <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>}
                                                </h3>
												<p className='text-sm font-light text-gray-600'>{user?.email}</p>
											</div>
										</div>
									</div>
								)
							}) : <div className='text-center text-lg font-semibold mt-24'>No Conversations</div>
					}
				</div>
			</div>
		</div>
	)
}

export default Dashboard