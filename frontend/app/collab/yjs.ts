import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"

export const ydoc = new Y.Doc()

export const provider = new WebsocketProvider(
  "ws://localhost:1234",   // websocket server (we’ll create it)
  "post-123",              // room id (same post)
  ydoc
)

export const yBlocks = ydoc.getArray<Y.Map<string>>("blocks")
