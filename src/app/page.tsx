"use client";

import {
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Stack,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { chat } from "./chat";
import { StoredMessage } from "langchain/schema";

type Message = { user: string; text: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [history, setHistory] = useState<StoredMessage[]>([]);
  const ref = useRef<HTMLUListElement>(null);

  const handleSend = async () => {
    setMessages((prev) => [...prev, { user: "You", text: newMessage }]);
    setNewMessage("");
    const { output, history: newHistory } = await chat({
      input: newMessage,
      history,
    });
    setMessages((prev) => [...prev, { user: "AI", text: output }]);
    setHistory(newHistory);
  };

  useEffect(() => {
    ref.current?.scroll({ top: 999999, behavior: "smooth" });
  }, [messages]);

  return (
    <Stack justifyContent="space-between" height="100vh">
      <List sx={{ overflow: "scroll" }} ref={ref}>
        {messages.map((message, index) => (
          <ListItem key={index}>
            <ListItemText primary={message.user} secondary={message.text} />
          </ListItem>
        ))}
      </List>
      <Stack direction="row" alignItems="center" padding={2}>
        <TextField
          fullWidth
          variant="outlined"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button variant="contained" onClick={handleSend} sx={{ ml: 2 }}>
          Send
        </Button>
      </Stack>
    </Stack>
  );
}
