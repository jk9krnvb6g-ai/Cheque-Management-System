# คู่มือการติดตั้งและเริ่มต้นใช้งาน (Installation Guide)

คู่มือนี้อธิบายขั้นตอนการติดตั้ง การตั้งค่า และการรันระบบ **ระบบจัดทำและพิมพ์เช็ค (Cheque Management & Printing System)** ทั้งในสภาพแวดล้อมเพื่อการพัฒนา (Development) และสำหรับติดตั้งใช้งานจริง (Production)

---

## 1. ความต้องการของระบบ (System Requirements)

- **Node.js**: เวอร์ชัน 18.0.0 หรือสูงกว่า (แนะนำ LTS 20+)
- **Package Manager**: `npm` (v9+), `yarn`, `pnpm` หรือ `bun`
- **เว็บเบราว์เซอร์**: Google Chrome, Microsoft Edge, Firefox, Safari (เวอร์ชันล่าสุดที่รองรับ HTML5 Canvas & Flexbox)
- **เครื่องพิมพ์ (Printer)**: รองรับเครื่องพิมพ์ด็อทเมทริกซ์ (Dot-Matrix Printer), อิงค์เจ็ท (Inkjet) หรือเลเซอร์ (Laser) ที่ใส่กระดาษหัวเช็คหรือ A4 ได้

---

## 2. ขั้นตอนการติดตั้งอย่างรวดเร็ว (Quick Start)

### ขั้นตอนที่ 1: โคลนหรือดาวน์โหลดซอร์สโค้ด
```bash
git clone <repository_url>
cd cheque-system
```

### ขั้นตอนที่ 2: ติดตั้ง Dependencies
```bash
npm install
```

### ขั้นตอนที่ 3: กำหนดค่า Environment Variables
คัดลอกไฟล์ตัวอย่าง `.env.example` ไปเป็น `.env`:
```bash
cp .env.example .env
```
*(หากไม่มีการตั้งค่าเฉพาะ ระบบจะใช้ค่าเริ่มต้น Port `3000`)*

### ขั้นตอนที่ 4: รันระบบในโหมดพัฒนา (Development Mode)
```bash
npm run dev
```
ระบบจะเปิด Full-Stack Server (Express API + Vite Dev Server) ที่:
👉 **http://localhost:3000**

---

## 3. สคริปต์คำสั่งที่มีในระบบ (Available Scripts)

| คำสั่ง | รายละเอียด |
|---|---|
| `npm run dev` | รันเซิร์ฟเวอร์แบบ Full-Stack (Express API + Vite HMR) บนพอร์ต 3000 |
| `npm run build` | คอมไพล์และสร้างชุดไฟล์ Production Frontend ในโฟลเดอร์ `dist/` |
| `npm run start` | รันเซิร์ฟเวอร์ Production ให้บริการทั้ง API และไฟล์ Static จาก `dist/` |
| `npm run lint` | ตรวจสอบ Syntax และ Type ความถูกต้องของ TypeScript (`tsc --noEmit`) |
| `npm run clean` | ลบโฟลเดอร์ Build ชั่วคราว (`dist/`) |

---

## 4. บัญชีผู้ใช้งานเริ่มต้นสำหรับเข้าสู่ระบบ (Default Credentials)

| ชื่อผู้ใช้ (Username) | รหัสผ่าน (Password) | สิทธิ์ (Role) | ตำแหน่ง |
|---|---|---|---|
| `admin` | `admin` | **ผู้ดูแลระบบสูงสุด (ADMIN)** | หัวหน้ากลุ่มงานการเงินและบัญชี |
| `somchai` | `1234` | **เจ้าหน้าที่การเงิน (USER)** | เจ้าพนักงานการเงินและบัญชีชำนาญงาน |
| `suda` | `1234` | **เจ้าหน้าที่การเงิน (USER)** | เจ้าหน้าที่การเงิน |

---

## 5. การตั้งค่าเครื่องพิมพ์เช็คให้ตรงช่อง 100% (Printer Setup Guide)

เมื่อกดพิมพ์เช็คหรือแผ่นทดสอบ A4 หน้าต่างพิมพ์ของระบบจะเปิดขึ้น กรุณาตั้งค่าไดรเวอร์เครื่องพิมพ์ในเบราว์เซอร์ดังนี้:

1. **ระยะขอบ (Margins)**: เลือกเป็น **`None` (ไม่มีระยะขอบ)**
2. **มาตราส่วน (Scale)**: เลือกเป็น **`100%`** หรือ **`Actual Size` (ขนาดจริง)** *(ห้ามเลือก Fit to Page / พอดีหน้ากระดาษ เพราะจะทำให้ตำแหน่งคลาดเคลื่อน)*
3. **ส่วนหัวและส่วนท้าย (Headers and Footers)**: ติ๊กถูก **`ออก` (ปิดการแสดงผล)**
4. **ทิศทางการป้อนกระดาษ**: 
   - สำหรับพิมพ์ลงตัวเช็คจริง ให้ปรับแท่นหนีบกระดาษของเครื่องพิมพ์ให้แนบพอดีกับขอบเช็ค
   - หากตำแหน่งพิมพ์ไม่ตรงช่อง สามารถเข้าไปปรับพิกัดได้ที่แท็บ **⚙️ ตั้งค่าแม่แบบพิมพ์ (Templates)**

---

## 6. การนำไป Deploy ใช้งานจริง (Production Deployment)

### วิธีที่ 1: รันด้วย Node.js / PM2
```bash
# 1. Build Frontend
npm run build

# 2. รันด้วย PM2 Process Manager
pm2 start server.ts --name "cheque-app" --interpreter ./node_modules/.bin/tsx
```

### วิธีที่ 2: รันผ่าน Docker Container
สร้างไฟล์ `Dockerfile` และรันด้วยคำสั่ง:
```bash
docker build -t cheque-management-system .
docker run -d -p 3000:3000 --name cheque-app cheque-management-system
```
