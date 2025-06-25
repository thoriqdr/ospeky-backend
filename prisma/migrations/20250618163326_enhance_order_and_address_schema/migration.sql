/*
  Warnings:

  - You are about to alter the column `status` on the `Pesanan` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(1))`.

*/
-- AlterTable
ALTER TABLE `Pesanan` ADD COLUMN `alamatPengirimanId` VARCHAR(191) NULL,
    ADD COLUMN `jumlahDp` INTEGER NULL,
    ADD COLUMN `jumlahPelunasan` INTEGER NULL,
    ADD COLUMN `metodePembayaran` VARCHAR(191) NULL,
    ADD COLUMN `statusPacking` ENUM('BELUM_DIKEMAS', 'SEDANG_DIKEMAS', 'SIAP_DIKIRIM') NOT NULL DEFAULT 'BELUM_DIKEMAS',
    ADD COLUMN `tanggalDp` DATETIME(3) NULL,
    ADD COLUMN `tanggalPelunasan` DATETIME(3) NULL,
    MODIFY `status` ENUM('MENUNGGU_PEMBAYARAN', 'LUNAS', 'DIPROSES', 'DIKIRIM', 'SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'MENUNGGU_PEMBAYARAN';
