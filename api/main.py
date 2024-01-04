from typing import List
from uvicorn import run
from fastapi import FastAPI
from mangum import Mangum
from langchain.text_splitter import HTMLHeaderTextSplitter
from langchain_core.documents import Document
from pydantic import BaseModel

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


class Request(BaseModel):
    items: list[str]


def modify(string: str) -> str:
    return string.upper()


@app.post("/split")
def split(req: Request):
    headers_to_split_on = [
        ("h1", "Header 1"),
        ("h2", "Header 2"),
        ("h3", "Header 3"),
    ]
    html_splitter = HTMLHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
    docs: List[Document] = []
    for item in req.items:
        docs.extend(html_splitter.split_text(item))
    return {"docs": docs}


if __name__ == "__main__":
    run(app, host="0.0.0.0", port=4000)

handler = Mangum(app)
