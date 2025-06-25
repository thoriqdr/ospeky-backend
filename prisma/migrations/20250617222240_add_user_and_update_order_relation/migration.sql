/*
  Warnings:

  - You are about to drop the column `alamatPemesan` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `idPesanan` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `jumlahDp` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `jumlahPelunasan` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `namaPemesan` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `statusPacking` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `statusPembayaran` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `statusPesanan` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `teleponPemesan` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `totalHarga` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `waktuDiterima` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `waktuDp` on the `Pesanan` table. All the data in the column will be lost.
  - You are about to drop the column `waktuPelunasan` on the `Pesanan` table. All the data in the column will be lost.
  - Added the required column `status` to the `Pesanan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `Pesanan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Pesanan` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Pesanan_idPesanan_key` ON `Pesanan`;

-- AlterTable
ALTER TABLE `DetailPesanan` ADD COLUMN `variantId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Pesanan` DROP COLUMN `alamatPemesan`,
    DROP COLUMN `idPesanan`,
    DROP COLUMN `jumlahDp`,
    DROP COLUMN `jumlahPelunasan`,
    DROP COLUMN `namaPemesan`,
    DROP COLUMN `statusPacking`,
    DROP COLUMN `statusPembayaran`,
    DROP COLUMN `statusPesanan`,
    DROP COLUMN `teleponPemesan`,
    DROP COLUMN `totalHarga`,
    DROP COLUMN `waktuDiterima`,
    DROP COLUMN `waktuDp`,
    DROP COLUMN `waktuPelunasan`,
    ADD COLUMN `status` VARCHAR(191) NOT NULL,
    ADD COLUMN `total` INTEGER NOT NULL,
    ADD COLUMN `userId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `nomorHp` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
    `firebaseUid` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_firebaseUid_key`(`firebaseUid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
