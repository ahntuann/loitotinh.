import imageCompression from "browser-image-compression";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// 1. Xử lý ẢNH (Dễ, nhẹ)
export const compressImageService = async (file) => {
  console.log(`📸 Ảnh gốc: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

  const options = {
    maxSizeMB: 0.8, // Mục tiêu: Dưới 800KB
    maxWidthOrHeight: 1080, // Resize về HD
    useWebWorker: true,
    fileType: "image/jpeg", // Convert hết về JPG cho Unity dễ đọc
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(
      `✅ Ảnh nén: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`
    );
    return compressedFile;
  } catch (error) {
    console.warn("Lỗi nén ảnh, dùng ảnh gốc:", error);
    return file;
  }
};

// 2. Xử lý VIDEO (Nặng, dùng FFmpeg WASM)
let ffmpeg = null; // Biến singleton để không load lại nhiều lần

export const compressVideoService = async (file, onProgress) => {
  console.log(`🎥 Video gốc: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

  // --- LAZY LOAD FFMPEG ---
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

    // Tải core từ CDN về khi cần dùng
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });
  }
  // ------------------------

  // Ghi file vào bộ nhớ ảo
  await ffmpeg.writeFile("input.mp4", await fetchFile(file));

  // Theo dõi tiến trình
  ffmpeg.on("progress", ({ progress }) => {
    if (onProgress) onProgress(Math.round(progress * 100));
  });

  // LỆNH NÉN TỐI ƯU CHẤT LƯỢNG (High Quality - Balanced Speed)
  await ffmpeg.exec([
    "-i",
    "input.mp4",
    "-vf",
    "scale=-2:720", // Vẫn giữ 720p (đủ nét cho điện thoại, 1080p hơi thừa)
    "-c:v",
    "libx264", // Codec chuẩn nhất

    // 1. CHẤT LƯỢNG HÌNH ẢNH (Quan trọng nhất)
    "-crf",
    "23", // Số này càng nhỏ càng nét.
    // 23 là chuẩn mực của web (cân bằng).
    // Nếu muốn nét căng đét như gốc thì xuống 20 (nhưng file nặng hơn).

    // 2. TỐC ĐỘ NÉN vs HIỆU QUẢ NÉN
    "-preset",
    "medium", // 'medium' là chế độ mặc định cân bằng nhất.
    // Nó nén kỹ hơn 'ultrafast' rất nhiều -> Hình đẹp hơn, file nhẹ hơn.
    // Đừng dùng 'veryslow' trên trình duyệt vì sẽ bị treo máy.

    // 3. MÀU SẮC (Bắt buộc cho iPhone/Android)
    "-pix_fmt",
    "yuv420p", // BẮT BUỘC. Nếu thiếu cái này, video lên iPhone có thể bị đen màn hình.

    // 4. ÂM THANH
    "-c:a",
    "aac", // Chuẩn âm thanh MP4
    "-b:a",
    "128k", // Chất lượng âm thanh 128kbps là đủ nghe rõ lời

    "output.mp4",
  ]);

  // Đọc file kết quả
  const data = await ffmpeg.readFile("output.mp4");
  const blob = new Blob([data.buffer], { type: "video/mp4" });

  console.log(`✅ Video nén: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
  return blob;
};
