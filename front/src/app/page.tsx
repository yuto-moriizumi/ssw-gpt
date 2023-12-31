"use client";

import {
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Stack,
  Box,
  Typography,
  Avatar,
  ListItemAvatar,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { StoredMessage } from "langchain/schema";
import axios from "axios";

enum User {
  YOU = "あなた",
  AI = "ばいおず",
}
type Message = { user: User; text: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [history, setHistory] = useState<StoredMessage[]>([]);
  const ref = useRef<HTMLUListElement>(null);

  const handleSend = async () => {
    setMessages((prev) => [...prev, { user: User.YOU, text: newMessage }]);
    setNewMessage("");
    const { output, history: newHistory } = await getChat({
      input: newMessage,
      history,
    });
    setMessages((prev) => [...prev, { user: User.AI, text: output }]);
    setHistory(newHistory);
  };

  useEffect(() => {
    ref.current?.scroll({ top: 999999, behavior: "smooth" });
  }, [messages]);

  return (
    <Stack justifyContent="space-between" height="100vh">
      <Box sx={{ overflow: "scroll" }} padding={2} ref={ref}>
        <Typography variant="h3" textAlign="center">
          ばいおずGPT
        </Typography>
        <Typography textAlign="center">
          AIばいおずが、あなたの疑問にお答えします！
        </Typography>
        <List>
          {messages.map((message, index) => (
            <ListItem key={index}>
              <ListItemAvatar>
                <Avatar
                  src={message.user === User.AI ? "vaioz.jpg" : undefined}
                />
              </ListItemAvatar>
              <ListItemText
                primary={message.user}
                secondary={message.text}
                sx={{ whiteSpace: "pre-wrap" }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
      <Stack direction="row" alignItems="center" padding={2}>
        <TextField
          fullWidth
          variant="outlined"
          value={newMessage}
          placeholder="ここに質問を入力してください"
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button variant="contained" onClick={handleSend} sx={{ ml: 2 }}>
          送信
        </Button>
      </Stack>
    </Stack>
  );
}

async function getChat(req: Request) {
  const responce = await axios.post<Response>(
    "https://gx4rs5oxxj.execute-api.ap-northeast-1.amazonaws.com/chat",
    { ...req },
  );
  return responce.data;
}

type Request = {
  input: string;
  history?: StoredMessage[];
};
type Response = {
  output: string;
  history: StoredMessage[];
};
