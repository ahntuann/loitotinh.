import { useState } from "react";
import "./App.css"; // CSS mặc định của Vite

// Thay link worker thật của bạn vào
const API_URL = "https://loitotinh-backend.ahntuann.workers.dev";

function App() {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");
  const [result, setResult] = useState(null);

  // Hàm helper để hiện log
  const addLog = (msg) => setLog((prev) => `${msg}\n${prev}`);

  const handleProcess = async (e) => {
    e.preventDefault();
    const imgFile = e.target.img.files[0];
    const vidFile = e.target.vid.files[0];
    const msg = e.target.msg.value;
    const pWidth = e.target.pWidth.value;

    if (!imgFile || !vidFile) return alert("Thiếu file!");

    setLoading(true);
    setResult(null);
    setLog("🚀 Đang khởi động...");

    try {
      // --- KỸ THUẬT LAZY LOAD ---
      // Lúc này trình duyệt mới tải thư viện nén về
      addLog("📦 Đang tải bộ xử lý hình ảnh...");
      const { compressImageService, compressVideoService } = await import(
        "./services/compressor"
      );

      // 1. Nén Ảnh
      addLog("🖼️ Đang nén ảnh...");
      const compressedImg = await compressImageService(imgFile);

      // 2. Nén Video
      addLog("🎬 Đang nén video (Vui lòng chờ)...");
      const compressedVid = await compressVideoService(vidFile, (percent) => {
        // Cập nhật % nén, có thể làm thanh loading bar ở đây
        if (percent % 10 === 0) addLog(`... xử lý video: ${percent}%`);
      });

      // 3. Gọi API xin link
      addLog("☁️ Đang xin quyền Upload...");
      const res1 = await fetch(`${API_URL}/api/get-upload-urls`, {
        method: "POST",
        body: JSON.stringify({ videoExt: "mp4", imageExt: "jpg" }),
      });
      const data1 = await res1.json();
      const newId = data1.giftId;

      // 4. Upload lên R2
      addLog(`⬆️ Đang đẩy file lên Cloud (ID: ${newId})...`);
      await Promise.all([
        fetch(data1.upload.image.url, { method: "PUT", body: compressedImg }),
        fetch(data1.upload.video.url, { method: "PUT", body: compressedVid }),
      ]);

      // 5. Finalize
      addLog("✅ Đang hoàn tất...");
      await fetch(`${API_URL}/api/finalize-upload`, {
        method: "POST",
        body: JSON.stringify({
          giftId: newId,
          videoKey: data1.upload.video.key,
          imageKey: data1.upload.image.key,
          message: msg,
          physicalWidth: parseFloat(pWidth),
          config: { video_scale: 1.0, video_rotation: 0 }, // Default config
        }),
      });

      setResult(newId);
      addLog("🎉 XONG! Thành công rực rỡ.");
    } catch (err) {
      console.error(err);
      addLog(`❌ Lỗi: ${err.message}`);
      alert("Có lỗi xảy ra, xem log chi tiết.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "sans-serif",
      }}
    >
      <h1>💖 Tạo Quà Tỏ Tình (AR)</h1>

      {!result ? (
        <form
          onSubmit={handleProcess}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          <div>
            <label style={{ fontWeight: "bold" }}>
              1. Ảnh Tracking (Thiệp/Ảnh in):
            </label>
            <input
              name="img"
              type="file"
              accept="image/*"
              disabled={loading}
              style={{ display: "block", marginTop: 5 }}
            />
          </div>

          <div>
            <label style={{ fontWeight: "bold" }}>2. Video Lời chúc:</label>
            <input
              name="vid"
              type="file"
              accept="video/*"
              disabled={loading}
              style={{ display: "block", marginTop: 5 }}
            />
            <small>Nên quay ngang hoặc dọc tùy theo ảnh in.</small>
          </div>

          <div>
            <label style={{ fontWeight: "bold" }}>3. Lời nhắn:</label>
            <input
              name="msg"
              type="text"
              defaultValue="I Love You 3000"
              disabled={loading}
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <div>
            <label style={{ fontWeight: "bold" }}>
              4. Kích thước thật của ảnh (mét):
            </label>
            <input
              name="pWidth"
              type="number"
              step="0.01"
              defaultValue="0.15"
              disabled={loading}
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "15px",
              backgroundColor: loading ? "#ccc" : "#ff4081",
              color: "white",
              border: "none",
              borderRadius: "5px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "⏳ ĐANG XỬ LÝ (Đừng tắt tab)..." : "🚀 TẠO QUÀ NGAY"}
          </button>
        </form>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "30px",
            border: "2px dashed #4caf50",
            background: "#e8f5e9",
          }}
        >
          <h2>MÃ QUÀ CỦA BẠN</h2>
          <h1
            style={{
              fontSize: "4rem",
              margin: "10px 0",
              color: "#c2185b",
              letterSpacing: "5px",
            }}
          >
            {result}
          </h1>
          <p>Hãy viết mã này lên thiệp.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: 10 }}
          >
            Làm cái khác
          </button>
        </div>
      )}

      {/* Khu vực Log */}
      <div
        style={{
          marginTop: "20px",
          background: "#f5f5f5",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "12px",
          height: "150px",
          overflowY: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {log || "Sẵn sàng..."}
      </div>
    </div>
  );
}

export default App;
