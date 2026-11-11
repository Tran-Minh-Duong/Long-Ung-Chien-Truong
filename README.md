# Long Ưng Chiến Trường - Đại Chiến 3 Đường

Game tương tác cho buổi TikTok LIVE. Người xem gõ lệnh vào comment để chọn phe Đỏ hoặc Xanh, điều khiển quân đi 3 đường (Top, Mid, Bot), kéo quân về thủ nhà hoặc tập kích hang Rồng, hang Baron. Khi người xem thả quà, cổng không gian mở ra triệu hồi từ Binh lính, Cung binh cho tới Kỵ sĩ rồng và Bá chủ Rồng Ưng kèm avatar, tên người gọi và giọng MC đọc vang danh tướng quân vừa tiếp viện.

Bản đồ MOBA 3 đường tỷ lệ dọc 864x1536 chuẩn khung hình điện thoại, có sông cắt ngang, hang Rồng (DRAG), hang Baron, hệ thống trụ bảo vệ và Nhà Chính hai đầu hiển thị phần trăm máu theo thời gian thực. Gõ lệnh viết thường, viết hoa hay có khoảng trắng thừa (1, 2, top, mid, adc, bac, upatk, downatk) đều nhận đúng lộ trình.

## ⚠️ Đọc trước khi dùng: lưu ý, cảnh báo và trách nhiệm

Game chia sẻ miễn phí, ai cũng lấy về dùng được. Trước khi dùng cho buổi live của mình, đọc kỹ mấy điều sau:

1. Đồ hoạ và bản đồ là hình mô phỏng. Bản đồ 3 đường, quái vật, rồng và hiệu ứng kỹ năng được thiết kế mô phỏng theo phong cách chiến thuật giải trí, không thuộc hay đại diện cho bất kỳ tựa game MOBA thương mại nào. Giao diện đã tối ưu cho khung hình dọc 864x1536 để vừa màn hình điện thoại.
2. Không dùng game để cá cược hay trao thưởng. Game chỉ tính sát thương, phá nhà chính và xếp hạng Top 1, 2, 3 người đóng góp nhiều nhất mỗi trận cho vui, không có giải thưởng. Nếu bạn tự đặt thêm thưởng tiền, quà hay tổ chức bắt kèo thắng thua giữa Đội Đỏ và Đội Xanh, việc đó có thể bị coi là cờ bạc, cá cược hoặc trò chơi có thưởng trái phép theo luật, và bạn tự chịu hoàn toàn trách nhiệm.
3. Tiền quà là thu nhập của bạn. Quà người xem tặng để triệu hồi lính và rồng là thu nhập của người live. Việc kê khai, nộp thuế thì bạn tự tìm hiểu theo quy định hiện hành.
4. Kết nối và giọng đọc dùng công cụ không chính thức. Game nối vào phòng live (bắt comment, bắt quà) và tạo giọng đọc thông báo qua các công cụ bên ngoài, không phải công cụ chính thức của nền tảng hay của Microsoft, Google. Các công cụ này có thể ngừng chạy bất cứ lúc nào. Rủi ro với tài khoản của bạn (bị hạn chế, khoá tính năng live) bạn tự cân nhắc.
5. Bộ lọc từ tục không bắt được hết. Game chỉ nhận các từ khoá lệnh hợp lệ (1, 2, top, mid, adc, bac, upatk, downatk) và đã lọc tên hiển thị nhạy cảm, MC không bao giờ đọc nguyên văn comment tự do của người xem. Dù vậy người xem luôn nghĩ ra cách đặt tên lách luật, nên chủ kênh vẫn phải tự để mắt và chịu trách nhiệm về nội dung buổi live của mình.
6. Thông số máu, sát thương và cấu hình quà tặng (Hoa hồng, Donut, Mũ, Corgi...) được đặt theo mức cân bằng mặc định, có thể chưa khớp với ý đồ phòng live của bạn. Muốn chỉnh lại sức mạnh lính hoặc đổi loại quà thì sửa trong `src/game/unitConfig.ts`.
7. Dùng game là bạn tự trách nhiệm. Game được chia sẻ nguyên trạng, không kèm cam kết gì. Tác giả không chịu trách nhiệm về thiệt hại hay rắc rối pháp lý phát sinh khi bạn sử dụng. Mấy điều trên là tự tìm hiểu, không phải tư vấn pháp lý. Ai live với mục đích kinh doanh thì nên hỏi luật sư.

---

## Chạy game & Cấu trúc dự án

### Chạy
- Cài Node.js (bản LTS). Bấm đúp `BAT-LIVE.bat`. Lần đầu tự cài thư viện mất 1–2 phút, xong thì tự mở trang điều khiển.
- Máy có VieNeu ở `E:\02_AI\VieNeu-TTS` thì file tự bật luôn; không có thì dùng giọng Microsoft Edge `Nam Minh` / `Hoài My`.
- **Trang điều khiển:** `http://localhost:3000` (nếu cổng bận sẽ dùng cổng kế tiếp, xem cửa sổ đen in ra).
- **TikTok LIVE Studio:** thêm nguồn Link `http://lvh.me:3000/?view=stage`, khổ `1080×1920`. Gõ tên TikTok vào ô Kết nối.
- Trang điều khiển có nút giả lập (gõ 1/2, đi đường top/mid/adc/bac/upatk/downatk, tim, quà theo mức xu), live tự động 10/50/100 người, mô phỏng trọn trận 30 phút, và nút kiểm tra đếm comment (gửi 200 comment đủ kiểu rồi so số đếm).

### Cấu trúc
- `public/game.html`: Toàn bộ trận đấu (luật 3 đường, bản đồ, hiệu ứng, âm thanh, giọng MC).
- `public/img/game/`, `public/sound/`: Hình nền, biểu tượng quà và âm thanh trận đấu.
- `src/game/`: Nối sự kiện TikTok vào game, cấu hình lính (`unitConfig.ts`), tọa độ (`waypoints.ts`), phân tích lệnh (`commandParser.ts`), nút điều khiển (`GameControls.tsx`).
- `src/live/`, `server.ts`: Phần dùng chung (kết nối TikTok, giọng đọc `/api/tts`, trang điều khiển `Dashboard.tsx`, `BAT-LIVE.bat`).

