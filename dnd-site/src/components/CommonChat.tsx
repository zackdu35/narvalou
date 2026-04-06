import React, { useState } from 'react'

export const CommonChat = ({ messages, data, curT, sendMessage, supabase }: { messages: any[], data: any, curT: any, sendMessage: (text: string, receiverId: string) => void, supabase: any }) => {
  const [typedMessage, setTypedMessage] = useState('')

  const commonMessages = messages.filter((m: any) => {
    const content = (m.content || "").toUpperCase();
    return m.receiver_id === 'global' && 
           !content.includes('[REFRESH') && 
           !content.includes('[SYNC_SCENE');
  })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!typedMessage.trim() || !supabase) return
    sendMessage(typedMessage, 'global')
    setTypedMessage('')
  }

  return (
    <div className="common-chat-container">
      <div className="common-chat-messages">
        {commonMessages.length === 0 && (
          <div className="chat-empty">{curT.emptyChat}</div>
        )}
        {commonMessages.map((m: any, i: number) => {
          const senderChar = data.characters?.find((c: any) => c.id === m.sender_id)
          const senderName = m.sender_id === 'DM' ? 'Le Maître du Donjon' : (senderChar?.name || m.sender_id)
          const cleanContent = m.content.replace(/\[AUDIO:.*?\]/g, '').trim()

          return (
            <div key={i} className={`common-msg ${m.sender_id === 'DM' ? 'dm-msg' : 'player-msg'}`}>
              <span className="msg-author">{senderName}:</span>
              <span className="msg-content">
                {cleanContent.split(/(@[A-Za-z0-9_À-ÿ]+)/g).map((part: string, idx: number) =>
                  part.match(/^@[A-Za-z0-9_À-ÿ]+/) ? (
                    <span key={idx} className="mention">{part}</span>
                  ) : part
                )}
              </span>
            </div>
          )
        })}
      </div>
      <form className="common-chat-input" onSubmit={handleSend}>
        <input
          type="text"
          placeholder={curT.saySomething}
          value={typedMessage}
          onChange={e => setTypedMessage(e.target.value)}
        />
        <button type="submit">↪</button>
      </form>
    </div>
  )
}
