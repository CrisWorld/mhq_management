# MHQ · Sổ cửa hàng nội thất

**Bản triển khai:** https://mhq.toeic-handbook.site

Supabase Auth dùng `https://mhq.toeic-handbook.site` làm Site URL. Phiên đăng nhập lưu riêng theo domain: khi chuyển từ URL Vercel cũ, đăng nhập một lần trên domain mới; cơ chế giữ phiên và tự làm mới token tiếp tục hoạt động.

Ứng dụng React dành cho điện thoại, API NestJS và Supabase (PostgreSQL + Auth). Frontend và API chạy cùng một dự án Vercel, không cần thuê máy chủ riêng.

## Chức năng

- Chỉ đăng nhập bằng tài khoản được cấp sẵn qua Supabase Auth. Đăng ký công khai bị tắt.
- Dashboard chọn tháng, biểu đồ doanh thu và thực thu theo năm; danh sách khách chưa trả góp.
- Tìm khách theo tên không dấu, điện thoại hoặc địa chỉ; thêm/sửa/xoá mềm khách; gọi bằng liên kết điện thoại.
- Chia sẻ công nợ riêng của từng khách qua Zalo/Messenger: xem đơn hàng, khoản đã trả, nợ gốc và lãi mà không cần đăng nhập; có thể thu hồi link.
- Tạo đơn từ khách, chọn sản phẩm/số lượng, thêm nhanh sản phẩm, ghi nhận trả trước, ngày mua và ghi chú.
- Sửa đơn: ngày mua, sản phẩm, số lượng, đơn giá, lựa chọn tính lãi và ghi chú. Giữ mức lãi đã snapshot từ lúc tạo.
- Thêm/sửa/xoá mềm khoản trả trước và trả góp, xem phân bổ lãi/gốc và lịch sử công nợ được tính lại.
- Thêm/sửa/xoá mềm ghi chú cho mỗi khách, kèm thời gian Việt Nam.
- Thêm/sửa/xoá mềm sản phẩm, cài đặt mức lãi, tải bản sao dữ liệu đang hoạt động (JSON).
- Cửa hàng → **Thùng rác**: xem và khôi phục khách hàng, sản phẩm, đơn hàng, khoản thu, ghi chú. Không có thao tác xoá vĩnh viễn.

## Sửa và xoá dữ liệu

Mọi bản ghi nghiệp vụ có `deleted_at` và `updated_at`. Xoá chỉ đánh dấu thời gian; database chặn quyền `DELETE` của người dùng trên mọi bảng nghiệp vụ. Khi sửa sản phẩm trong đơn, những dòng cũ cũng được giữ lại bằng xoá mềm.

Xoá khách hàng ẩn các đơn, khoản thu, ghi chú và công nợ liên quan khỏi danh sách và báo cáo. Xoá đơn ẩn khoản thu của đơn. Khôi phục khách/đơn hiện lại dữ liệu con chưa bị xoá riêng; những mục bị xoá riêng vẫn ở Thùng rác. Cần khôi phục khách/đơn cha trước khi khôi phục ghi chú/khoản thu. Xoá sản phẩm khỏi danh mục không ảnh hưởng tên/giá đã lưu trong đơn cũ.

Sửa/xoá khoản thu tính lại gốc và lãi từ lịch sử còn hoạt động; các báo cáo tháng cũ cũng phản ánh phần dữ liệu đang hoạt động. Sửa ngày mua chuyển ngày trả trước đang hoạt động theo ngày mua mới. Sửa tiền trả trước ở **Lịch sử công nợ → Sửa khoản thu**. Mỗi thay đổi tài chính chạy trong transaction với khoá theo cửa hàng, kiểm tra lại toàn bộ chuỗi khoản thu, từ chối nếu có khoản thu vượt nợ, sai ngày hoặc khôi phục gây thu thừa. Đơn/khoản thu có `version` để chặn ghi đè bằng biểu mẫu cũ.

## Quy tắc công nợ

1. Mặc định 20.000 ₫ cho mỗi 1.000.000 ₫ nợ gốc mỗi tháng (2%), tính theo tỷ lệ: 500.000 ₫ → 10.000 ₫. Không làm tròn lên theo bậc nợ.
2. Miễn lãi tháng mua. Ngày 1 mỗi tháng tiếp theo phát sinh lãi trên số gốc còn lại đầu tháng. Thu tiền vào ngày 1 diễn ra sau khi tính lãi tháng đó.
3. Lãi mỗi tháng làm tròn đến đồng; lãi chưa trả cộng dồn nhưng không nhập gốc, không sinh lãi kép.
4. Tiền nhận trả lãi trước rồi trừ gốc. Trả trước được ghi ngay vào ngày mua.
5. Mức lãi, có/không tính lãi và tên/giá sản phẩm được snapshot vào đơn. Đổi cài đặt, khách hoặc sản phẩm không sửa đơn cũ.
6. Không cần cron: công nợ được tính lại từ đơn và khoản thu chưa xoá theo ngày báo cáo. SQL xác minh lịch sử trước khi ghi nhận thay đổi, TypeScript hiển thị cùng quy tắc, có kiểm tra đối chiếu.
7. Không ghi thu trong tương lai, trước ngày mua hoặc trước lần thu gần nhất. Không thu quá số nợ tại ngày nhận tiền. Lưu đơn và trả trước trong một transaction; RPC khóa đơn khi thu; request UUID ngăn tạo giao dịch trùng khi retry.
8. Khách chưa trả góp trong tháng: có ít nhất một đơn mua trước tháng đó, còn dư nợ tại ngày báo cáo, chưa có lần thu trả góp trên đơn đó trong tháng. Khách có nhiều đơn phải có khoản thu ở từng đơn đang nợ; trả trước không tính là trả góp. Chưa có lịch hẹn hoặc mức trả góp bắt buộc.
9. Doanh thu là tổng giá trị đơn theo ngày mua; thực thu là tiền nhận theo ngày nhận, gồm trả trước và trả góp. Báo cáo quá khứ chốt cuối tháng, tháng hiện tại chốt hôm nay, múi giờ `Asia/Ho_Chi_Minh`.

## Chia sẻ công nợ cho khách

Trong chi tiết khách hàng, chọn **Chia sẻ công nợ → Tạo link chia sẻ**. Trên thiết bị hỗ trợ, nút chia sẻ mở bảng chia sẻ của hệ điều hành để chọn Zalo/Messenger; luôn có **Sao chép link** để dán vào cuộc trò chuyện. Khách mở link sẽ thấy trang chỉ xem, không cần tài khoản. Trang dùng cùng thuật toán công nợ với cửa hàng và lấy số liệu mới khi mở hoặc bấm Làm mới.

Mỗi khách có một link đang hoạt động, dùng lại được trên các thiết bị của chủ cửa hàng. Ai có link đều xem được tên khách, tên cửa hàng, sản phẩm/giá, lịch sử thanh toán và cách tính lãi của khách đó. Trang không cung cấp số điện thoại, địa chỉ hoặc ghi chú nội bộ, không có quyền sửa dữ liệu. Link không tự hết hạn; chủ cửa hàng có thể **Thu hồi link chia sẻ** rồi tạo link mới. Xoá mềm khách tự thu hồi link; khôi phục khách không kích hoạt lại link cũ. Các bản ghi link đã thu hồi được giữ lại.

Token ngẫu nhiên 256 bit nằm trong fragment `/share#…`, không nằm trong request URL gửi đến máy chủ; API nhận token qua body của `POST /api/public/statement`. Trang/API không cache và yêu cầu công cụ tìm kiếm không lập chỉ mục. RPC công khai chỉ đọc dữ liệu của một khách khi có token hợp lệ; các bảng vẫn được bảo vệ bằng RLS. Không gửi link vào dịch vụ phân tích hoặc lưu token vào log.

## Cấu trúc dự án

```text
src/
  app/
    App.tsx, AppRoutes.tsx   # Khởi tạo ứng dụng và định tuyến
    providers/              # AuthProvider, StoreProvider, UiProvider
    layout/                 # Header, điều hướng, khung ứng dụng
    overlays/               # Hộp thoại theo chức năng và quản lý focus
  features/
    auth/                   # Chỉ đăng nhập
    dashboard/              # Trang báo cáo, biểu đồ doanh thu
    customers/              # Danh sách, chi tiết, biểu mẫu, ghi chú
    orders/                 # Chi tiết đơn, tạo đơn, chọn sản phẩm, thu tiền
    products/               # Danh mục và biểu mẫu sản phẩm
    settings/               # Chính sách lãi, Thùng rác, xuất dữ liệu, đăng xuất
    sharing/                # Quản lý link và trang công nợ công khai chỉ xem
  shared/ui/                # Component giao diện dùng chung
  lib/                      # Supabase client, HTTP client, định dạng, lỗi
  styles/                   # CSS tách theo chức năng
server/
  app.ts                    # Khởi tạo NestJS/Express cho local và Vercel
  app.module.ts             # Ghép các module nghiệp vụ
  modules/                  # auth, health, customers, products, orders,
                            # payments, settings, state, trash, sharing
    <feature>/              # Module, controller, service, DTO của chức năng
  common/                   # Database helpers, validation decorator
  config/                   # Đọc cấu hình máy chủ
shared/                     # Kiểu dữ liệu và thuật toán công nợ
api/                        # Entrypoint serverless Vercel
supabase/migrations/        # Schema, RLS và RPC giao dịch
```

Controller chỉ nhận request và chuyển đến service. Service gọi Supabase bằng JWT của người dùng, tiếp tục áp dụng RLS. Frontend tách trạng thái phiên đăng nhập, dữ liệu và giao diện; các trang và biểu mẫu nằm trong feature tương ứng. Chính sách tính lãi giữ ở `shared/finance.ts` và được đối chiếu với SQL trong kiểm thử database.

`npm run format` định dạng mã; `npm run format:check` kiểm tra định dạng. TypeScript bật `strict`, kiểm tra biến và tham số không dùng.

## Phiên đăng nhập

Phiên được lưu bền vững bằng `localStorage` của Supabase SDK và tự làm mới bằng refresh token, kể cả khi đóng trình duyệt rồi mở lại sau hơn một tuần. Giữ nguyên storage key mặc định để các phiên đang dùng tiếp tục hoạt động khi cập nhật ứng dụng. Access token vẫn có thời hạn ngắn; không kéo dài JWT thành một tuần.

Ứng dụng khôi phục phiên khi mở trang, quay lại ứng dụng hoặc có mạng trở lại. Lỗi mạng khi khôi phục hiện nút thử lại, không tự xoá phiên hay buộc nhập lại mật khẩu. API trả 401 sẽ được làm mới token và thử lại đúng một lần; không tự lặp giao dịch khi lỗi mạng hoặc lỗi nghiệp vụ. Đăng xuất chỉ kết thúc phiên trên thiết bị hiện tại.

Trên Supabase hosted, giới hạn thời gian phiên và thời gian không hoạt động phải tắt hoặc dài hơn thời gian cần giữ phiên; mặc định Supabase không giới hạn hai thời gian này. `test:session` xác minh cấu hình hosted bằng tài khoản riêng: lùi thời gian phiên/hoạt động refresh token 8 ngày, mở lại client với access token hết hạn, khôi phục và gọi API. Kiểm thử cũng xác minh đăng xuất vẫn có hiệu lực. Tài khoản mẫu được dọn sạch. Việc xoá dữ liệu trình duyệt/chế độ riêng tư hoặc thu hồi phiên sẽ yêu cầu đăng nhập lại.

## Phát triển

Dùng Node.js 22 (`nvm use`), sau đó:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Điền Supabase URL và publishable key vào `.env.local`. API local ở cổng 3001, Vite ở cổng 5173. Không dùng service-role key. Frontend chỉ nhận `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`.

```sh
npm run build
npm test
npm run db:migrate
npm run test:db
# Kiểm tra HTTP có đăng nhập (tạo và tự dọn tài khoản mẫu riêng):
TEST_BASE_URL=https://mhq.toeic-handbook.site npm run test:live
# Kiểm tra khôi phục phiên sau 8 ngày không hoạt động (giả lập, tài khoản riêng):
TEST_BASE_URL=https://mhq.toeic-handbook.site npm run test:session
```

`db:migrate` và `test:db` dùng `DATABASE_HOST`, `DATABASE_USER`, `SUPERBASE_DATABASE_PASSWORD` (giữ tên biến của workspace ban đầu). Kết nối SSL xác minh chứng chỉ gốc chính thức trong `supabase/prod-ca-2021.crt`. Mật khẩu DB chỉ ở máy cá nhân và không đưa lên Vercel/Git. Các fixture database kiểm thử nằm trong transaction luôn rollback.

## Supabase & bảo mật

Các migration nằm trong `supabase/migrations/`. Mọi bảng nghiệp vụ bật RLS theo `auth.uid()`, FK ghép ngăn tham chiếu chéo cửa hàng. `anon` không có quyền đọc bảng; ngoại lệ được giới hạn ở RPC đọc công nợ bằng token chia sẻ hợp lệ. Khách, sản phẩm, ghi chú, đơn, chi tiết đơn và khoản thu chỉ có quyền đọc trực tiếp; mọi thay đổi đi qua RPC kiểm tra chủ sở hữu và dữ liệu đã xoá. API xác minh JWT với Supabase Auth và tiếp tục dùng token người dùng, không bypass RLS.

API: `/api/health`, `/api/state`, `/api/customers`, `/api/products`, `/api/customers/:id/notes`, `/api/orders`, `/api/orders/:id/payments`, `/api/settings`.

Các tài nguyên khách/sản phẩm/đơn/ghi chú/khoản thu hỗ trợ `POST` tạo, `PATCH .../:id` sửa và `DELETE .../:id` xoá mềm. Đơn/khoản thu cần `version` hiện tại khi sửa. `GET /api/trash` liệt kê mục đã xoá; `PATCH /api/trash/:type/:id/restore` khôi phục (`customer`, `product`, `order`, `note`, `payment`).

`GET/POST/DELETE /api/customers/:id/share` lần lượt xem, tạo/dùng lại và thu hồi link; yêu cầu đăng nhập và đúng chủ khách hàng. `POST /api/public/statement` chỉ đọc công nợ bằng token, không cần đăng nhập. Kiểm thử database và HTTP bao gồm cách ly giữa chủ cửa hàng, thu hồi/tạo lại, xoá/khôi phục khách, tạo đồng thời và lọc ghi chú riêng tư.

## Deploy Vercel

Import repo, dùng preset Vite, root `./`, build `npm run build`, output `dist`, Node.js 22. `vercel.json` cấu hình API NestJS serverless cùng SPA fallback. Biến môi trường:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL` (cùng URL trên)
- `SUPABASE_PUBLISHABLE_KEY` (cùng publishable key trên)

Supabase → Authentication: bật email provider, tắt **Allow new users to sign up**. Tài khoản cửa hàng được cấp sẵn trong Supabase Auth. Site URL và redirect URL trỏ tới domain Vercel. Ứng dụng chỉ có màn hình đăng nhập; không có đăng ký hoặc dữ liệu trải nghiệm. Không lưu email/mật khẩu đăng nhập trong mã nguồn hay biến môi trường frontend.

## Phạm vi phiên bản đầu

Chưa có nhiều nhân viên cùng cửa hàng, nhắc nợ tự động, tồn kho hoặc nhập lại bản sao JSON. Ghi chú dùng cho lịch hẹn thu. Cửa hàng nên tải bản sao định kỳ qua Cài đặt. Không chứa dữ liệu khách thật trong repo.
