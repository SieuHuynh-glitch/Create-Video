import sys
import asyncio
import json
import time
import subprocess
import os
import shutil
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

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

DEFAULT_COLAB_URL = "https://colab.research.google.com/drive/1RfiMJjd0_hgBZtjAR38yOUVTU2EyYk2R"
TARGET_COLAB_URL = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith("http") else DEFAULT_COLAB_URL
FIXED_PORT = 63171
FIXED_TOKEN = "uTqswYzURvVmqvINBrwESw"

CELL_2_CODE = """# 1 & 2. Cài đặt thư viện & Đồng bộ dự án
!pip install -q diffusers transformers accelerate sentencepiece protobuf imageio[ffmpeg] opencv-python bitsandbytes psutil

try:
    from google.colab import drive
    drive.mount('/content/drive', force_remount=False)
except Exception:
    pass

import os
WORKSPACE_DIR = "/content/Create-Video"
if not os.path.exists(WORKSPACE_DIR):
    !git clone https://github.com/SieuHuynh-glitch/Create-Video.git {WORKSPACE_DIR}
else:
    %cd {WORKSPACE_DIR}
    !git pull origin master

%cd {WORKSPACE_DIR}
"""

CELL_3_CODE = """# 3. Khởi động Worker sinh video AI 12 cảnh LTX-Video
!python scripts/colab_worker.py --slug natural-cycle
"""

CELL_4_CODE = """# 4. Tự động đóng gói và tải 12 clips về máy
!zip -r -j /content/natural-cycle-done.zip /content/Create-Video/jobs/done/natural-cycle/
from google.colab import files
files.download('/content/natural-cycle-done.zip')
"""

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
        print(f"📡 WebSocket Server đang lắng nghe trên cổng: {self.port}", flush=True)
        return self

async def main():
    print("==================================================", flush=True)
    print("🤖 ĐIỀU PHỐI TỰ ĐỘNG CHẠY GOOGLE COLAB & HOÀN THÀNH VIDEO", flush=True)
    print(f"Sổ tay mục tiêu: {TARGET_COLAB_URL}", flush=True)
    print("==================================================", flush=True)

    wss = FixedColabWebSocketServer()
    async with wss:
        token = wss.token
        port = wss.port
        # Không truyền chuỗi email vào query authuser vì Google GAPI chỉ nhận số nguyên (0, 1, 2) hoặc URL sạch
        connect_url = f"{TARGET_COLAB_URL}#mcpProxyToken={token}&mcpProxyPort={port}"

        print(f"\n👉 Mở tab Colab (Hãy đảm bảo trình duyệt đang chọn tài khoản protectionZs01@gmail.com):", flush=True)
        print(f"{connect_url}\n", flush=True)

        # Không tự động mở Edge đè lên tài khoản người dùng đang chọn
        if "--open-browser" in sys.argv:
            try:
                subprocess.Popen(["powershell", "-Command", f"Start-Process msedge '{connect_url}'"])
            except Exception as e:
                print(f"Lỗi mở Edge: {e}", flush=True)

        print("⏳ Đang đợi tab Colab trên Edge kết nối lại (chế độ chờ bền bỉ 60 phút)...", flush=True)
        try:
            await asyncio.wait_for(wss.connection_live.wait(), timeout=3600.0)
            print("🎉 ĐÃ KẾT NỐI VỚI GOOGLE COLAB THÀNH CÔNG!", flush=True)
        except asyncio.TimeoutError:
            print("❌ Hết thời gian chờ kết nối từ Colab.", flush=True)
            return

        proxy_client = ColabProxyClient(wss)
        async with proxy_client:
            await proxy_client.await_proxy_connection()
            client = proxy_client.client_factory()

            if not client:
                print("❌ Không thể khởi tạo MCP Client từ Colab Proxy.", flush=True)
                return

            print("\n🔍 Đang đọc danh sách ô code trong sổ tay...", flush=True)
            cells_res = await client.call_tool("get_cells", {"includeOutputs": True})

            raw_text = ""
            if hasattr(cells_res, 'content') and cells_res.content:
                raw_text = cells_res.content[0].text
            elif isinstance(cells_res, dict):
                raw_text = json.dumps(cells_res)
            else:
                raw_text = str(cells_res)

            cell2_id = None
            cell3_id = None

            try:
                data = json.loads(raw_text)
                cells = data.get("cells", [])
                for c in cells:
                    src = "".join(c.get("source", []))
                    cid = c.get("id")
                    if "drive.mount" in src or "git pull" in src:
                        cell2_id = cid
                    elif "colab_worker.py" in src:
                        cell3_id = cid
            except Exception as e:
                print(f"Parse error: {e}", flush=True)

            print(f"📍 Cell 2 (Drive & Git Pull): {cell2_id}", flush=True)
            print(f"📍 Cell 3 (Colab Worker):     {cell3_id}", flush=True)

            # Cập nhật ô 2 và ô 3 để đảm bảo code mới nhất
            if cell2_id:
                print("\n🔄 Đang cập nhật nội dung chuẩn cho Ô 2...", flush=True)
                await client.call_tool("update_cell", {"cellId": cell2_id, "content": CELL_2_CODE})
            else:
                print("\n➕ Đang chèn Ô 2...", flush=True)
                r = await client.call_tool("add_code_cell", {"cellIndex": 1, "language": "python", "code": CELL_2_CODE})
                try:
                    cell2_id = json.loads(r.content[0].text).get("newCellId")
                except Exception:
                    pass

            if cell3_id:
                print("🔄 Đang cập nhật nội dung chuẩn cho Ô 3...", flush=True)
                await client.call_tool("update_cell", {"cellId": cell3_id, "content": CELL_3_CODE})
            else:
                print("➕ Đang chèn Ô 3...", flush=True)
                r = await client.call_tool("add_code_cell", {"cellIndex": 2, "language": "python", "code": CELL_3_CODE})
                try:
                    cell3_id = json.loads(r.content[0].text).get("newCellId")
                except Exception:
                    pass

            # BẮT ĐẦU CHẠY TỰ ĐỘNG Ô 2: GIT PULL
            if cell2_id:
                print(f"\n▶️ [1/2] ĐANG TỰ BẤM CHẠY Ô 2 (Kéo 10 ảnh mới từ GitHub về Colab)...", flush=True)
                try:
                    out2 = await client.call_tool("run_code_cell", {"cellId": cell2_id})
                    print(f"✅ Ô 2 chạy xong:\n{out2}", flush=True)
                except Exception as e:
                    print(f"⚠️ Lỗi chạy Ô 2: {e}", flush=True)

            # BẮT ĐẦU CHẠY TỰ ĐỘNG Ô 3: COLAB WORKER LTX-VIDEO
            if cell3_id:
                print(f"\n▶️ [2/2] ĐANG TỰ BẤM CHẠY Ô 3 (Khởi chạy Worker AI sinh video 12 shot)...", flush=True)
                try:
                    await client.call_tool("run_code_cell", {"cellId": cell3_id})
                    print("⏳ Đang theo dõi tiến độ sinh 12 clips từ Colab...", flush=True)
                    completed = False
                    for _ in range(360):  # Tối đa 90 phút (15s x 360)
                        await asyncio.sleep(15)
                        try:
                            check_res = await client.call_tool("get_cells", {"includeOutputs": True})
                            txt = check_res.content[0].text if hasattr(check_res, 'content') and check_res.content else ""
                            c_data = json.loads(txt)
                            for c in c_data.get("cells", []):
                                if c.get("id") == cell3_id:
                                    outputs = c.get("outputs", [])
                                    all_out = ""
                                    for o in outputs:
                                        if "text" in o:
                                            all_out += "".join(o["text"])
                                    lines = [l for l in all_out.strip().split("\n") if l.strip()]
                                    if lines:
                                        last_few = lines[-2:]
                                        print(f"⏱️ [{time.strftime('%H:%M:%S')}] Tiến độ: {' | '.join(last_few)}", flush=True)
                                    if "WORKER ĐÃ HOÀN TẤT" in all_out:
                                        completed = True
                                        break
                        except Exception:
                            pass
                        if completed:
                            break
                    print(f"\n🏁 Ô 3 ĐÃ HOÀN TẤT SINH VIDEO!", flush=True)
                except Exception as e:
                    print(f"⚠️ Lỗi chạy Ô 3: {e}", flush=True)

            # BƠM VÀ CHẠY Ô 4: ĐÓNG GÓI & TẢI VỀ
            print("\n📦 Đang thêm và kích hoạt Ô 4 (Đóng gói & tải clips về máy)...", flush=True)
            try:
                r4 = await client.call_tool("add_code_cell", {"cellIndex": 3, "language": "python", "code": CELL_4_CODE})
                cell4_id = json.loads(r4.content[0].text).get("newCellId")
                if cell4_id:
                    print("▶️ Đang bấm chạy Ô 4...", flush=True)
                    await client.call_tool("run_code_cell", {"cellId": cell4_id})
                    print("✅ Đã kích hoạt tải natural-cycle-done.zip về máy!", flush=True)
            except Exception as e:
                print(f"Lỗi Ô 4: {e}", flush=True)

            # CHỜ FILE ZIP VỀ VÀ TỰ ĐỘNG RENDER MASTER REMOTION
            downloads_dir = Path(os.environ.get("USERPROFILE", "C:/Users/Admin")) / "Downloads"
            target_zip = downloads_dir / "natural-cycle-done.zip"
            print(f"\n⏳ Đang đợi file {target_zip} xuất hiện trong Downloads (tối đa 5 phút)...", flush=True)

            for _ in range(60):
                if target_zip.exists() and target_zip.stat().st_size > 1024:
                    print(f"🎉 Đã tìm thấy {target_zip}! Bắt đầu giải nén vào jobs/done/natural-cycle/...", flush=True)
                    dest_dir = Path("jobs/done/natural-cycle")
                    dest_dir.mkdir(parents=True, exist_ok=True)
                    shutil.unpack_archive(str(target_zip), str(dest_dir))
                    print("✅ Giải nén thành công! Bắt đầu kích hoạt upgrade_auto.ts...", flush=True)
                    subprocess.run(["npx", "tsx", "scripts/upgrade_auto.ts", "natural-cycle"])
                    break
                await asyncio.sleep(5)

            print("\n🎉 TOÀN BỘ QUY TRÌNH TỰ ĐỘNG ĐÃ HOÀN THÀNH XUẤT SẮC!", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
