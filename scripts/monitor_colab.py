import sys
import asyncio
import json
import time
try:
    import websockets  # type: ignore
    from websockets.typing import Subprotocol  # type: ignore
    from colab_mcp.websocket_server import ColabWebSocketServer  # type: ignore
    from colab_mcp.session import ColabProxyClient  # type: ignore
except ImportError:
    websockets = None  # type: ignore
    Subprotocol = None  # type: ignore
    ColabWebSocketServer = None  # type: ignore
    ColabProxyClient = None  # type: ignore

TARGET_COLAB_URL = "https://colab.research.google.com/drive/1ngaKgxnDtrgf-cjmjZonq96ecL89p3cb"
FIXED_PORT = 63171
FIXED_TOKEN = "uTqswYzURvVmqvINBrwESw"

class FixedColabWebSocketServer(ColabWebSocketServer):
    def __init__(self, host="localhost", port=FIXED_PORT, token=FIXED_TOKEN):
        super().__init__(host=host)
        self.desired_port = port
        self.token = token

    async def __aenter__(self):
        self._server = await websockets.serve(
            self._connection_handler,
            host=self.host,
            port=self.desired_port,
            subprotocols=[Subprotocol("mcp")],
            origins=self.allowed_origins,
            process_request=self._validate_authorization,
        )
        self.port = self._server.sockets[0].getsockname()[1]
        print(f"📡 WebSocket Server giám sát đang lắng nghe trên cổng: {self.port}", flush=True)
        return self

async def main():
    print("==================================================", flush=True)
    print("GIÁM SÁT TIẾN ĐỘ GOOGLE COLAB (REALTIME MONITOR)", flush=True)
    print(f"Sổ tay: {TARGET_COLAB_URL}", flush=True)
    print("==================================================", flush=True)

    wss = FixedColabWebSocketServer()
    async with wss:
        token = wss.token
        port = wss.port

        print("⏳ Đang đợi tab Colab kết nối để theo dõi tiến độ (tối đa 300s)...", flush=True)
        try:
            await asyncio.wait_for(wss.connection_live.wait(), timeout=300.0)
            print("🎉 ĐÃ KẾT NỐI VỚI COLAB - BẮT ĐẦU THEO DÕI TIẾN ĐỘ!", flush=True)
        except asyncio.TimeoutError:
            print("ℹ️ Tab Colab chưa gắn hash WebSocket hoặc đang chạy độc lập.", flush=True)
            return

        proxy_client = ColabProxyClient(wss)
        async with proxy_client:
            await proxy_client.await_proxy_connection()
            client = proxy_client.client_factory()

            if not client:
                print("❌ Không thể kết nối MCP client.", flush=True)
                return

            last_output_summary = ""
            while True:
                try:
                    cells_res = await client.call_tool("get_cells", {"includeOutputs": True})
                    raw_text = ""
                    if hasattr(cells_res, 'content') and cells_res.content:
                        raw_text = cells_res.content[0].text
                    elif isinstance(cells_res, dict):
                        raw_text = json.dumps(cells_res)
                    else:
                        raw_text = str(cells_res)

                    data = json.loads(raw_text)
                    cells = data.get("cells", [])

                    summary_lines = []
                    for idx, c in enumerate(cells):
                        src = "".join(c.get("source", []))[:30].replace("\n", " ")
                        outputs = c.get("outputs", [])
                        out_text = ""
                        for out in outputs:
                            if "text" in out:
                                out_text += "".join(out["text"])
                            elif "data" in out and "text/plain" in out["data"]:
                                out_text += "".join(out["data"]["text/plain"])

                        last_line = out_text.strip().split("\n")[-1] if out_text.strip() else "[Chưa có output]"
                        summary_lines.append(f"Cell {idx+1} ({src}...): {last_line[:80]}")

                    current_summary = " | ".join(summary_lines)
                    if current_summary != last_output_summary:
                        print(f"\n⏱️ [{time.strftime('%H:%M:%S')}] Cập nhật trạng thái:", flush=True)
                        for line in summary_lines:
                            print(f"   {line}", flush=True)
                        last_output_summary = current_summary

                    # Kiểm tra xem worker đã xong chưa
                    if any("WORKER ĐÃ HOÀN TẤT VÒNG LẶP" in str(c.get("outputs", [])) for c in cells):
                        print("\n🏆 COLAB WORKER ĐÃ HOÀN THÀNH TOÀN BỘ 12 SHOT!", flush=True)
                        break

                except Exception as e:
                    print(f"Lỗi đọc outputs: {e}", flush=True)

                await asyncio.sleep(15)

if __name__ == "__main__":
    asyncio.run(main())
