"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { collection, query, where, getDocs, addDoc, doc, updateDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowLeft, Send, User, MessageCircle, Paperclip } from "lucide-react"
import Link from "next/link"

interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderType: "client" | "consultant"
  message: string
  timestamp: string
  attachments?: string[]
}

interface Conversation {
  id: string
  clientId: string
  consultantId: string
  clientName: string
  consultantName: string
  lastMessage: string
  lastMessageTime: string
  clientUnread: number
  consultantUnread: number
}

export default function MessagesPage() {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      fetchConversations()

      // Check if there's a consultantId in URL params to start a new conversation
      const consultantId = searchParams.get("consultantId")
      if (consultantId && userData?.role === "client") {
        startNewConversation(consultantId)
      }
    }
  }, [user, userData, loading, router, searchParams])

  const fetchConversations = async () => {
    try {
      const conversationsRef = collection(db, "conversations")
      const userField = userData?.role === "client" ? "clientId" : "consultantId"
      const q = query(conversationsRef, where(userField, "==", user?.uid))
      const querySnapshot = await getDocs(q)

      const conversationsList: Conversation[] = []
      querySnapshot.forEach((doc) => {
        conversationsList.push({ id: doc.id, ...doc.data() } as Conversation)
      })

      // Sort by last message time
      conversationsList.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())
      setConversations(conversationsList)
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setLoadingConversations(false)
    }
  }

  const startNewConversation = async (consultantId: string) => {
    try {
      // Check if conversation already exists
      const existingConversation = conversations.find((conv) => conv.consultantId === consultantId)
      if (existingConversation) {
        setSelectedConversation(existingConversation)
        fetchMessages(existingConversation.id)
        return
      }

      // Fetch consultant details
      const consultantDoc = await getDocs(query(collection(db, "users"), where("uid", "==", consultantId)))
      if (consultantDoc.empty) return

      const consultantData = consultantDoc.docs[0].data()

      // Create new conversation
      const conversationData = {
        clientId: user!.uid,
        consultantId: consultantId,
        clientName: userData!.name,
        consultantName: consultantData.name,
        lastMessage: "",
        lastMessageTime: new Date().toISOString(),
        clientUnread: 0,
        consultantUnread: 0,
        createdAt: new Date().toISOString(),
      }

      const docRef = await addDoc(collection(db, "conversations"), conversationData)
      const newConversation = { id: docRef.id, ...conversationData }

      setConversations([newConversation, ...conversations])
      setSelectedConversation(newConversation)
    } catch (error) {
      console.error("Error starting conversation:", error)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true)
    try {
      // Use simple query without orderBy to avoid index issues
      const messagesRef = collection(db, "messages")
      const q = query(messagesRef, where("conversationId", "==", conversationId))

      // Set up real-time listener
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const messagesList: Message[] = []
        querySnapshot.forEach((doc) => {
          messagesList.push({ id: doc.id, ...doc.data() } as Message)
        })

        // Sort messages by timestamp in JavaScript
        messagesList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        setMessages(messagesList)
        setLoadingMessages(false)

        // Mark conversation as read for current user
        if (selectedConversation) {
          const unreadField = userData?.role === "client" ? "clientUnread" : "consultantUnread"
          await updateDoc(doc(db, "conversations", selectedConversation.id), {
            [unreadField]: 0,
          })
        }
      })

      return unsubscribe
    } catch (error) {
      console.error("Error fetching messages:", error)
      setLoadingMessages(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    setSending(true)
    try {
      const messageData = {
        conversationId: selectedConversation.id,
        senderId: user!.uid,
        senderName: userData!.name,
        senderType: userData!.role,
        message: newMessage,
        timestamp: new Date().toISOString(),
        createdAt: new Date().getTime(), // Add timestamp for sorting
        read: false, // Add read status
      }

      await addDoc(collection(db, "messages"), messageData)

      // Update conversation with last message and increment unread count for recipient
      const recipientField = userData?.role === "client" ? "consultantUnread" : "clientUnread"
      const currentUnread = (selectedConversation as any)[recipientField] || 0

      await updateDoc(doc(db, "conversations", selectedConversation.id), {
        lastMessage: newMessage,
        lastMessageTime: new Date().toISOString(),
        [recipientField]: currentUnread + 1,
      })

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
      alert("Error sending message. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href={userData?.role === "client" ? "/dashboard/client" : "/dashboard/consultant"}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Messages</span>
              </div>
            </div>
            <span className="text-gray-700">{userData?.name}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Conversations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingConversations ? (
                  <div className="text-center py-8">Loading conversations...</div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No conversations yet</p>
                    {userData?.role === "client" && (
                      <p className="text-sm text-gray-400 mt-2">
                        Start a conversation by clicking "Message" on an appointment
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[500px] overflow-y-auto">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-4 cursor-pointer hover:bg-gray-50 border-b ${
                          selectedConversation?.id === conversation.id ? "bg-blue-50" : ""
                        }`}
                        onClick={() => {
                          setSelectedConversation(conversation)
                          fetchMessages(conversation.id)
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-gray-200 p-2 rounded-full">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {userData?.role === "client"
                                ? `Dr. ${conversation.consultantName}`
                                : conversation.clientName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {conversation.lastMessage || "Start a conversation"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(conversation.lastMessageTime).toLocaleDateString()}
                            </p>
                          </div>
                          {((userData?.role === "client" && conversation.clientUnread > 0) ||
                            (userData?.role === "consultant" && conversation.consultantUnread > 0)) && (
                            <Badge variant="destructive" className="text-xs">
                              {userData?.role === "client" ? conversation.clientUnread : conversation.consultantUnread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              {selectedConversation ? (
                <>
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      {userData?.role === "client"
                        ? `Dr. ${selectedConversation.consultantName}`
                        : selectedConversation.clientName}
                    </CardTitle>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 overflow-y-auto p-4">
                    {loadingMessages ? (
                      <div className="text-center py-8">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.senderId === user?.uid ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.senderId === user?.uid ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900"
                              }`}
                            >
                              <div className="text-xs font-medium mb-1 opacity-75">{message.senderName}</div>
                              <p className="text-sm">{message.message}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  message.senderId === user?.uid ? "text-blue-100" : "text-gray-500"
                                }`}
                              >
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <div className="flex space-x-2">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        rows={2}
                        className="flex-1"
                      />
                      <div className="flex flex-col space-y-2">
                        <Button variant="outline" size="sm" disabled>
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} size="sm">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a conversation to start messaging</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

