# LPU Connect - Architecture Redesign Documentation

## Overview
Completely redesigned the application from a basic community platform to a modern social networking platform combining Discord-style communities with WhatsApp-style direct messaging.

## Key Features Implemented

### 1. **WhatsApp-Style Messaging System**
- Direct one-on-one conversations
- Group chat support with admin controls
- Real-time message delivery using Socket.io
- Message editing and deletion
- Message reactions and reply functionality
- Attachment/image sharing
- Emoji picker integration

### 2. **User Profile & Discovery System**
- User search with username, name, and email search
- User profiles with bios, interests, courses, and social links
- **Privacy-First Design**: Users can only see full profiles of people they follow
- Limited profile view for non-followers (shows name, username, followers count)
- User status (online/offline/away)
- Last seen tracking

### 3. **Social Features**
- **Follow System**: Users can follow/unfollow each other
- Followers and following lists with proper relationships
- Mutual friend detection
- Block users functionality
- Profile visibility gated behind follower status

### 4. **Group Chat Management**
- Create groups with multiple members
- Admin roles with special permissions
- Add/remove members from groups
- Group names, descriptions, and custom images
- Owner/admin indicators

### 5. **Modern UI Components**
- **ChatSidebar**: WhatsApp-like sidebar showing all conversations
- Search interface within chat sidebar
- Real-time conversation sorting (most recent first)
- Clean message UI with sender info, timestamps, and read status
- Responsive design for mobile and desktop

### 6. **Socket.io Integration**
- Replaced Agora RTM with Socket.io for real-time communication
- Real-time message delivery
- User online/offline status updates
- Typing indicators (foundation laid)
- Room-based architecture for scalability

## Database Schema Changes

### User Model Updates
```javascript
{
  // Existing fields...
  username: String (unique, indexed for search),
  status: enum(['online', 'offline', 'away']),
  friends: [ObjectId],
  followers: [ObjectId],
  following: [ObjectId],
  blockedUsers: [ObjectId],
  servers: [ObjectId],
  lastSeen: Date
}
```

### New Models

**GroupChat**
```javascript
{
  name: String (required),
  description: String,
  image: String,
  createdBy: ObjectId (User),
  members: [ObjectId (User)],
  admins: [ObjectId (User)],
  lastMessageAt: Date,
  timestamps: true
}
```

**Updated Conversation**
```javascript
{
  type: enum(['direct', 'group']),
  name: String,
  image: String,
  memberOneId: ObjectId (User) // for direct chats
  memberTwoId: ObjectId (User) // for direct chats
  groupId: ObjectId (GroupChat),
  members: [ObjectId (User)],
  lastMessageAt: Date
}
```

**Updated DirectMessage**
```javascript
{
  content: String,
  conversationId: ObjectId (required),
  senderId: ObjectId (User),
  attachments: [String],
  reactions: [{
    emoji: String,
    userId: ObjectId (User)
  }],
  replyTo: ObjectId (DirectMessage),
  edited: Boolean,
  deleted: Boolean,
  timestamps: true
}
```

## New API Routes

### Chat Management
- `POST /api/chats` - Create new direct chat conversation
- `GET /api/chats` - Get all conversations for authenticated user

### Messages
- `GET /api/chats/[conversationId]/messages` - Fetch messages
- `POST /api/chats/[conversationId]/messages` - Send message
- `PUT /api/chats/[conversationId]/messages/[messageId]` - Edit message
- `DELETE /api/chats/[conversationId]/messages/[messageId]` - Delete message

### User Profiles & Discovery
- `GET /api/users/search?q=query` - Search users by username, name, email
- `GET /api/users/[userId]/profile` - Get user profile (with privacy checks)
- `PUT /api/users/[userId]/profile` - Update own profile
- `POST /api/users/[userId]/follow` - Follow a user
- `DELETE /api/users/[userId]/follow` - Unfollow a user

### Group Chat
- `POST /api/groups` - Create new group chat
- `GET /api/groups` - Get all groups for user
- `POST /api/groups/[groupId]/members` - Add members to group
- `DELETE /api/groups/[groupId]/members` - Remove member from group

## New Pages & Components

### Pages
- `/messages` - Main messages hub
- `/messages/[conversationId]` - Individual conversation view

### Components
- `ChatSidebar.tsx` - Sidebar showing all conversations with search
- Messages page with full messaging UI

## Privacy & Security Features

1. **Profile Privacy**
   - Users only see full profiles if following
   - Non-followers see limited info (name, username, followers count)
   - Admins can override privacy

2. **Message Security**
   - Only senders can edit/delete their messages
   - Admins can manage group members
   - Users can leave groups anytime

3. **User Discovery**
   - Users must search to find others
   - Search indexed on username, name, email
   - Results exclude current user

## Migration Notes

### Breaking Changes
- Removed Agora RTM completely
- Old direct message routes still exist but messages use new format
- User model now requires username for search functionality

### Data Migration Needed
- Add username to all existing users (can use lowercase email prefix)
- Migrate existing conversations to new format
- Update old chat routes to redirect to new `/messages` page

## Future Enhancements

1. **Communities/Servers** (Similar to Discord)
   - Create community servers
   - Role-based permissions
   - Channel management
   - Server moderation tools

2. **Advanced Features**
   - Message search
   - Pin messages
   - Custom reactions
   - Voice/Video calls via Socket.io
   - Message read receipts
   - Typing indicators

3. **Performance**
   - Message pagination/infinite scroll
   - Redis caching for active users
   - Database indexing optimization
   - Message archiving

4. **User Experience**
   - Conversation notifications
   - Message mentions
   - Group mute/unmute
   - Custom notification sounds
   - Dark mode (already implemented)

## Testing Checklist

- [ ] Create direct chat with new user
- [ ] Send and receive messages in real-time
- [ ] Edit and delete messages
- [ ] Search for users
- [ ] Follow/unfollow users
- [ ] View follower/following lists
- [ ] Check profile privacy (non-follower view)
- [ ] Create group chat
- [ ] Add/remove members from group
- [ ] Socket.io connection and messaging
- [ ] Attachment/image uploads
- [ ] Emoji picker functionality
- [ ] Responsive design on mobile

## Deployment Notes

1. Update environment variables if needed
2. Run database migrations for existing users (add username)
3. Update WebSocket connection settings for Socket.io
4. Test with multiple concurrent connections
5. Monitor socket.io event rates in production

---
**Deployed**: January 4, 2026
**Commit**: f5aeb15
