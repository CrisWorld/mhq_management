# MHQ · Sổ cửa hàng nội thất

**Bản triển khai:** https://mhqmanagement.vercel.app

Ứng dụng React dành cho điện thoại, API NestJS và Supabase (PostgreSQL + Auth). Frontend và API chạy cùng một dự án Vercel, không cần thuê máy chủ riêng.

## Chức năng

- Chỉ đăng nhập bằng tài khoản được cấp sẵn qua Supabase Auth. Đăng ký công khai bị tắt.
- Dashboard chọn tháng, biểu đồ doanh thu và thực thu theo năm; danh sách khách chưa trả góp.
- Tìm khách theo tên không dấu, điện thoại hoặc địa chỉ; tạo/sửa khách; gọi bằng liên kết điện thoại.
- Tạo đơn từ khách, chọn sản phẩm/số lượng, thêm nhanh sản phẩm, ghi nhận trả trước, ngày mua và ghi chú.
- Thu trả góp, xem phân bổ lãi/gốc và lịch sử công nợ.
- Nhiều ghi chú cho mỗi khách, kèm thời gian Việt Nam.
- Danh mục sản phẩm, cài đặt mức lãi, tải bản sao dữ liệu JSON.

## Quy tắc công nợ

1. Mặc định 20.000 ₫ cho mỗi 1.000.000 ₫ nợ gốc mỗi tháng (2%), tính theo tỷ lệ: 500.000 ₫ → 10.000 ₫. Không làm tròn lên theo bậc nợ.
2. Miễn lãi tháng mua. Ngày 1 mỗi tháng tiếp theo phát sinh lãi trên số gốc còn lại đầu tháng. Thu tiền vào ngày 1 diễn ra sau khi tính lãi tháng đó.
3. Lãi mỗi tháng làm tròn đến đồng; lãi chưa trả cộng dồn nhưng không nhập gốc, không sinh lãi kép.
4. Tiền nhận trả lãi trước rồi trừ gốc. Trả trước được ghi ngay vào ngày mua.
5. Mức lãi, có/không tính lãi và tên/giá sản phẩm được snapshot vào đơn. Đổi cài đặt, khách hoặc sản phẩm không sửa đơn cũ.
6. Không cần cron: lịch sử bất biến được tính lại theo ngày báo cáo. SQL xác minh nợ trước khi ghi nhận thu, TypeScript hiển thị cùng quy tắc, có kiểm tra đối chiếu.
7. Không ghi thu trong tương lai, trước ngày mua hoặc trước lần thu gần nhất. Không thu quá số nợ tại ngày nhận tiền. Lưu đơn và trả trước trong một transaction; RPC khóa đơn khi thu; request UUID ngăn tạo giao dịch trùng khi retry.
8. Khách chưa trả góp trong tháng: có ít nhất một đơn mua trước tháng đó, còn dư nợ tại ngày báo cáo, chưa có lần thu trả góp trên đơn đó trong tháng. Khách có nhiều đơn phải có khoản thu ở từng đơn đang nợ; trả trước không tính là trả góp. Chưa có lịch hẹn hoặc mức trả góp bắt buộc.
9. Doanh thu là tổng giá trị đơn theo ngày mua; thực thu là tiền nhận theo ngày nhận, gồm trả trước và trả góp. Báo cáo quá khứ chốt cuối tháng, tháng hiện tại chốt hôm nay, múi giờ `Asia/Ho_Chi_Minh`.

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
    settings/               # Chính sách lãi, xuất dữ liệu, đăng xuất
  shared/ui/                # Component giao diện dùng chung
  lib/                      # Supabase client, HTTP client, định dạng, lỗi
  styles/                   # CSS tách theo chức năng
server/
  app.ts                    # Khởi tạo NestJS/Express cho local và Vercel
  app.module.ts             # Ghép các module nghiệp vụ
  modules/                  # auth, health, customers, products, orders,
                            # payments, settings, state
    <feature>/              # Module, controller, service, DTO của chức năng
  common/                   # Database helpers, validation decorator
  config/                   # Đọc cấu hình máy chủ
shared/                     # Kiểu dữ liệu và thuật toán công nợ
api/                        # Entrypoint serverless Vercel
supabase/migrations/        # Schema, RLS và RPC giao dịch
```

Controller chỉ nhận request và chuyển đến service. Service gọi Supabase bằng JWT của người dùng, tiếp tục áp dụng RLS. Frontend tách trạng thái phiên đăng nhập, dữ liệu và giao diện; các trang và biểu mẫu nằm trong feature tương ứng. Chính sách tính lãi giữ ở `shared/finance.ts` và được đối chiếu với SQL trong kiểm thử database.

`npm run format` định dạng mã; `npm run format:check` kiểm tra định dạng. TypeScript bật `strict`, kiểm tra biến và tham số không dùng.

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
TEST_BASE_URL=https://mhqmanagement.vercel.app npm run test:live
```

`db:migrate` và `test:db` dùng `DATABASE_HOST`, `DATABASE_USER`, `SUPERBASE_DATABASE_PASSWORD` (giữ tên biến của workspace ban đầu). Kết nối SSL xác minh chứng chỉ gốc chính thức trong `supabase/prod-ca-2021.crt`. Mật khẩu DB chỉ ở máy cá nhân và không đưa lên Vercel/Git. Các fixture database kiểm thử nằm trong transaction luôn rollback.

## Supabase & bảo mật

Các migration nằm trong `supabase/migrations/`. Mọi bảng nghiệp vụ bật RLS theo `auth.uid()`, FK ghép ngăn tham chiếu chéo cửa hàng. `anon` không có quyền dữ liệu. Người dùng không được trực tiếp thêm/sửa/xóa đơn, chi tiết đơn, khoản thu: chỉ ghi qua các RPC có kiểm tra chủ sở hữu. API xác minh JWT với Supabase Auth và tiếp tục dùng token người dùng, không bypass RLS.

API: `/api/health`, `/api/state`, `/api/customers`, `/api/products`, `/api/customers/:id/notes`, `/api/orders`, `/api/orders/:id/payments`, `/api/settings`.

## Deploy Vercel

Import repo, dùng preset Vite, root `./`, build `npm run build`, output `dist`, Node.js 22. `vercel.json` cấu hình API NestJS serverless cùng SPA fallback. Biến môi trường:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL` (cùng URL trên)
- `SUPABASE_PUBLISHABLE_KEY` (cùng publishable key trên)

Supabase → Authentication: bật email provider, tắt **Allow new users to sign up**. Tài khoản cửa hàng được cấp sẵn trong Supabase Auth. Site URL và redirect URL trỏ tới domain Vercel. Ứng dụng chỉ có màn hình đăng nhập; không có đăng ký hoặc dữ liệu trải nghiệm. Không lưu email/mật khẩu đăng nhập trong mã nguồn hay biến môi trường frontend.

## Phạm vi phiên bản đầu

Chưa có nhiều nhân viên cùng cửa hàng, chỉnh/xóa giao dịch tài chính, nhắc nợ tự động, tồn kho hoặc nhập lại bản sao JSON. Ghi chú dùng cho lịch hẹn thu. Cửa hàng nên tải bản sao định kỳ qua Cài đặt. Không chứa dữ liệu khách thật trong repo.
