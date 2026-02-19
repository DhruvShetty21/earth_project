const ChatService = {
    async send(message) {
        try {
            const res = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await res.json();
            return data.reply;

        } catch (err) {
            console.error('Chat error:', err);
            return "⚠️ AI unavailable";
        }
    }
};

window.ChatService = ChatService;
