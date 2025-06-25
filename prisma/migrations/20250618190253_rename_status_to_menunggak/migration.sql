/*
  Warnings:

  - You are about to alter the column `status` on the `Pesanan` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `Enum(EnumId(1))`.

*/
-- AlterTable
ALTER TABLE `Pesanan` MODIFY `status` ENUM('MENUNGGAK', 'LUNAS', 'DIPROSES', 'DIKIRIM', 'SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'MENUNGGAK';
